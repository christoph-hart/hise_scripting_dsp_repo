/** BufferAnalyser - a custom panel that plots the content of a buffer.

	License: MIT License

	Copyright 2019 Christoph Hart
*/

namespace BufferAnalyser
{
    const var NUM_SAMPLES_SHOWN = 1300;
    
    
    inline function createPlot(buffer, width, maxSize)
    {
        local path = Content.createPath();
        local range = dsp.getRange(buffer, maxSize);
        local scale = Math.max(Math.abs(range[0]), Math.abs(range[1]));
        local samplesPerPixel = maxSize / width;
        local maxValues = [];
        maxValues.reserve(width);
        
        for(bin = 0; bin < maxSize; bin += samplesPerPixel)
        {
            local maxValue = 0.0;
            local minValue = 0.0;

            for(i = 0; i < samplesPerPixel; i++)
            {
                maxValue = Math.max(buffer[bin + i], maxValue);
                minValue = Math.min(buffer[bin + i], minValue);
            }
        
            if(maxValue > Math.abs(minValue))
                maxValues.push(maxValue / scale);
            else
                maxValues.push(minValue / scale);
        }
    
        path.clear();
        path.startNewSubPath(0.0, 1.0 - maxValues[0]);
    
        for(i = 1; i < maxValues.length; i++)
            path.lineTo(i, 1.0 - maxValues[i]);
    
        path.lineTo(i, 1.0);
        path.lineTo(0, 1.0);
    
        return path;
    };
    
    inline function plot(panel, buffer)
    {
        panel.data.plot = BufferAnalyser.createPlot(buffer, panel.get("width"), NUM_SAMPLES_SHOWN);
        panel.repaint();
    }
    
    inline function setData(panel, d)
    {
        panel.data.d = d;
        panel.repaint();
    }
    
    inline function make(name)
    {
        local p = Content.getComponent(name);
        
        p.setPaintRoutine(function(g)
        {
            var r = dsp.getRange(b, b.length);
            var maxValue = Engine.doubleToString(r[1], 3);
            var minValue = Engine.doubleToString(r[0], 3);
	
            if(this.data.d.harmPositions.length > 0)
            {
                for(h in this.data.d.harmPositions)
                {
                    g.setColour(0x88FF0000);
                    var xOffset = h / BufferAnalyser.NUM_SAMPLES_SHOWN * this.getWidth();
                    g.drawLine(xOffset, xOffset, 0.0, this.getHeight(), 1.0);
                }
            }
	
            g.setColour(0x77AAAAAA);
            g.drawPath(this.data.plot, [0, 0, this.getWidth(), this.getHeight()], 2.0);
	
            g.setColour(0xFFFFFFFF);
            g.drawAlignedText(maxValue, [0, 0, 100, 12], "left");
            g.drawAlignedText(minValue, [0, this.getHeight() - 12, 100, 12], "left");
        });
        
        return p;
    }
}
