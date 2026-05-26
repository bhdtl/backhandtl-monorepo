import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';

interface PlayerStats {
  name: string;
  skills: {
    serve: number; forehand: number; backhand: number; speed: number; power: number; mental: number; stamina?: number; volley?: number;
  };
  color: string;
}

interface PlayerRadarProps {
  playerA: PlayerStats;
  playerB?: PlayerStats;
}

export function PlayerRadar({ playerA, playerB }: PlayerRadarProps) {
  const data = [
    { subject: 'Serve', A: playerA.skills.serve, B: playerB?.skills.serve || 0, fullMark: 100 },
    { subject: 'Forehand', A: playerA.skills.forehand, B: playerB?.skills.forehand || 0, fullMark: 100 },
    { subject: 'Backhand', A: playerA.skills.backhand, B: playerB?.skills.backhand || 0, fullMark: 100 },
    { subject: 'Volley', A: playerA.skills.volley || 50, B: playerB?.skills.volley || 50, fullMark: 100 },
    { subject: 'Speed', A: playerA.skills.speed, B: playerB?.skills.speed || 0, fullMark: 100 },
    { subject: 'Power', A: playerA.skills.power, B: playerB?.skills.power || 0, fullMark: 100 },
    { subject: 'Stamina', A: playerA.skills.stamina || 50, B: playerB?.skills.stamina || 50, fullMark: 100 },
    { subject: 'Mental', A: playerA.skills.mental, B: playerB?.skills.mental || 0, fullMark: 100 },
  ];

  return (
    <div className="w-full h-full min-h-[300px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 11, fontWeight: 600 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name={playerA.name} dataKey="A" stroke={playerA.color} strokeWidth={3} fill={playerA.color} fillOpacity={0.3} />
          {playerB && <Radar name={playerB.name} dataKey="B" stroke={playerB.color} strokeWidth={3} fill={playerB.color} fillOpacity={0.3} />}
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} itemStyle={{ color: '#fff', fontSize: '12px' }} />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}