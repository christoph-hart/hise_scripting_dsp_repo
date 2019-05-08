/** DSP Functions - a collection of various DSP analysis functions

    License: MIT License

    Copyright 2019 Christoph Hart
*/

namespace dsp
{
    const var FFTSize = parseInt(Math.pow(2, 14));
    const var MAX_HARMONICS = 16;
    
    inline function loadSampleForFFT(s, index)
    {
        s.selectSounds(".*");
        local sample = s.loadSampleForAnalysis(index);
    
        local b = Buffer.create(FFTSize);
    
        for(i = 0; i < b.length; i++)
        {
            b[i] = i < sample[0].length ? sample[0][i] : 0.0;
        }
    
        return b;
    }
    
    inline function fft(buffer)
    {
        local f = Libraries.load("core").createModule("fft");

        f.prepareToPlay(44100.0, FFTSize);
        f.setParameter(fft.Window, fft.BlackmanHarris);
        f.setParameter(fft.Window, fft.Hann);

        f >> buffer;
    }
    
    /** Finds the first peak bin (approximately the root frequency). */
    inline function findFirstPeak(buffer, offset)
    {
        local maxValue = 0.0;
        local lastValue = 0.0;
        local index = 0;
        
        for(s in buffer)
        {
            if(index++ < 6)
                lastValue = 0.0;
            else
                lastValue = lastValue * 0.9 + s * 0.1;
            
            maxValue = Math.max(maxValue, lastValue);
        }
        
        index = 0;
        
        for(s in buffer)
        {
            if(index++ < 6)
                lastValue = 0.0;
            else
                lastValue = lastValue * 0.9 + s * 0.1;
            
            if(lastValue > 0.1 * maxValue)
            {
                return index;
            }
        }
        
        return -1;
    }
    
    /** returns the maximum [x, y] for the given buffer at the supplied index.
        Uses 10-point sinc interpolation.
    */
    inline function getInterpolatedMaximum(buffer, maxIndex)
    {
        if(maxIndex < 5 || maxIndex > (buffer.length - 5))
            return [];
        
        local maxPoints = [
          [maxIndex - 5, buffer[maxIndex - 5]],
          [maxIndex - 4, buffer[maxIndex - 4]],
          [maxIndex - 3, buffer[maxIndex - 3]],
          [maxIndex - 2, buffer[maxIndex - 2]],
          [maxIndex - 1, buffer[maxIndex - 1]],
          [maxIndex,     buffer[maxIndex]],
          [maxIndex + 1, buffer[maxIndex + 1]],
          [maxIndex + 2, buffer[maxIndex + 2]],
          [maxIndex + 3, buffer[maxIndex + 3]],
          [maxIndex + 4, buffer[maxIndex + 4]],
          [maxIndex + 5, buffer[maxIndex + 5]],
        ];
        
        local positions = [];
        local delta = 0.001;
        
        for(pos = maxIndex - 1.0; pos < (maxIndex + 1.0); pos += delta)
        {
            local v = 0.0;
            
            for(mp in maxPoints)
            {
                v += getSincFromMaximum(mp, pos);
            };
            
            positions.push([pos, v]);
        }
        
        local maxValue = 0.0;
        
        for(p in positions)
            maxValue = Math.max(maxValue, p[1]);
            
        for(p in positions)
        {
            if(p[1] == maxValue)
                return p;
        }
        
        Console.print("ERROR: Can't find freq");
        return [];
    }
    
    /** Returns the maximum for the given x position within the delta range. */
    inline function findApproxMax(buffer, x, delta)
    {
        local maxValue = 0.0;
        
        for(g = x - delta; g < x + delta; g++)
            maxValue = Math.max(buffer[g], maxValue);
        
        for(g = x - delta; g < x + delta; g++)
        {
            if(buffer[g] == maxValue)
                return g;
        }
        
        return -1;
    }
    
    inline function getSincFromMaximum(maxPoint, x)
    {
        local xMax = maxPoint[0];
        
        local delta = x - xMax;
        
        return maxPoint[1] * sinc(delta);
    }
    
    inline function sinc(x)
    {
        if(x == 0)
            return 1.0;
            
        return Math.sin(Math.PI * x) / (Math.PI * x);
    }
    
    inline function FFTIndexToFreq(index)
    {
        return index / (FFTSize) * 44100.0;
    }
    
    inline function freqToFFTIndex(freq)
    {
        return freq / 44100.0 * FFTSize;
    }
    
    inline function findRootFrequency(buffer)
    {
        local obj = {};
        
        local maxValue = getRange(buffer, -1)[1];
        local index = 0;
        local rootFreq = 0.0;
        local rootGain = 0.0;
        
        local firstIndex = findFirstPeak(buffer, 0);
        
        if(firstIndex == -1)
        {
            Console.print("Can't find peak");
            return obj;
        }
        
        local interpolatedMax = getInterpolatedMaximum(buffer, firstIndex);
                
        rootGain = interpolatedMax[1];
        rootFreq = FFTIndexToFreq(interpolatedMax[0]) ;
        
        if(rootFreq != 0.0)
        {
            local numHarmonics = Math.min(MAX_HARMONICS, parseInt(Math.floor(44100.0 / rootFreq)) - 1);
            
            
            obj.values = [];
            obj.values.reserve(numHarmonics);
            
            
            obj.harmPositions = [];
            obj.harmPositions.reserve(numHarmonics);
            
            local delta = parseInt(freqToFFTIndex(rootFreq) / 3);
            
            Console.print(delta);
            
            
            for(i = 1; i < numHarmonics; i++)
            {
                local index = parseInt(freqToFFTIndex(rootFreq * i));
                local betterIndex = findApproxMax(buffer, index, delta);
                local max = getInterpolatedMaximum(buffer, betterIndex);
                
                rootFreq = 0.7 * rootFreq + 0.3 * FFTIndexToFreq(max[0]) / i;
                
                obj.harmPositions.push(max[0]);
                obj.values.push(max[1]);
            }
            
            local maxGain = 0.0;
            
            for(v in obj.values)
            {
                maxGain = Math.max(v, maxGain);
            }
            
            for(v in obj.values)
                v /= maxGain;
        }
        
        return obj;
    }
    
    inline function analyseHarmonics(buffer)
    {
        return findRootFrequency(buffer);
    }
    
    inline function getRange(buffer, maxSize)
    {
        local range = [100000.0, -1000000.0];
        local index = 0;
        
        for(s in buffer)
        {
            range[0] = Math.min(range[0], s);
            range[1] = Math.max(range[1], s);
            
            if(maxSize != -1 && index++ > maxSize)
                break;
        }
        
        return range;
    }
}