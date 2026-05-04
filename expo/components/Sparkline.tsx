import React, { useMemo } from "react";
import { View } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { Colors } from "@/constants/colors";

interface Props {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  testID?: string;
}

export default function Sparkline({ data, width = 120, height = 40, color = Colors.blue, fill = true, testID }: Props) {
  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: "", area: "" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = Math.max(1, max - min);
    const stepX = width / (data.length - 1);
    const pts = data.map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const lineP = `M ${pts.join(" L ")}`;
    const areaP = `${lineP} L ${width},${height} L 0,${height} Z`;
    return { line: lineP, area: areaP };
  }, [data, width, height]);

  return (
    <View testID={testID} style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.25} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill && <Path d={area} fill={`url(#grad-${color})`} />}
        <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}
