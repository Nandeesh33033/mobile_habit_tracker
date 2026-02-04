
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  ChevronLeft, ChevronRight, Plus, Trash2, X, Check
} from 'lucide-react';
import { format, addMonths, isSameMonth, differenceInDays, isSameDay } from 'date-fns';
import { Habit } from './types';
import { getDaysInMonth, getWeeksInMonth, formatDate, generateId, startOfWeek, startOfYear, isWithinInterval, startOfDay } from './utils';

const HABIT_COLORS = [
  '#4cceac', // Teal (GT Accent)
  '#ff2d7d', // Cyber Pink
  '#00bfff', // Electric Blue
  '#ffcc00', // Gold
  '#9370db', // Neon Purple
  '#ff6b6b', // Red
  '#4da3ff', // Sky
  '#a3a3a3', // Steel
  '#ffffff', // Clean White
];

const THEME = {
  bg: '#0a0e1a',
  card: '#1f2a40',
  accent: '#4cceac',
  textMain: '#e0e0e0',
  textMuted: '#a3a3a3',
  border: '#333b52',
  weekColors: [
    '#ff2d7d', 
    '#9370db', 
    '#00bfff', 
    '#ffcc00', 
    '#4cceac'
  ]
};

type Timeframe = 'daily' | 'weekly' | 'monthly' | 'yearly';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(startOfDay(new Date()));
  const [focusedDate, setFocusedDate] = useState(startOfDay(new Date()));
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [progressTimeframe, setProgressTimeframe] = useState<Timeframe>('daily');
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habit_tracker_gt10pro');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'Morning Cardio', goal: 16, color: '#4cceac', completions: [], type: 'daily' },
      { id: '2', name: 'Deep Work', goal: 20, color: '#ff2d7d', completions: [], type: 'daily' },
      { id: '3', name: 'Hydration 3L', goal: 28, color: '#00bfff', completions: [], type: 'daily' },
      { id: '4', name: 'Meditation', goal: 15, color: '#ffcc00', completions: [], type: 'daily' },
      { id: '5', name: 'Read 20 Pages', goal: 20, color: '#9370db', completions: [], type: 'daily' },
      { id: '6', name: 'Clean Desk', goal: 30, color: '#ff6b6b', completions: [], type: 'daily' },
      { id: '7', name: 'Meal Prep', goal: 4, color: '#a3a3a3', completions: [], type: 'weekly' },
    ];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalHabitType, setModalHabitType] = useState<'daily' | 'weekly'>('daily');
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitGoal, setNewHabitGoal] = useState(0);
  const [newHabitColor, setNewHabitColor] = useState(HABIT_COLORS[0]);

  useEffect(() => {
    localStorage.setItem('habit_tracker_gt10pro', JSON.stringify(habits));
  }, [habits]);

  const daysOfMonth = useMemo(() => getDaysInMonth(currentDate), [currentDate]);
  const weeksOfMonth = useMemo(() => getWeeksInMonth(currentDate), [currentDate]);
  const selectedHabit = useMemo(() => habits.find(h => h.id === selectedHabitId) || null, [habits, selectedHabitId]);

  const handleDayFocus = (date: Date) => {
    const normalized = startOfDay(date);
    setFocusedDate(normalized);
    setProgressTimeframe('daily');
  };

  const toggleHabit = (habitId: string, date: Date) => {
    const dateStr = formatDate(date);
    handleDayFocus(date);
    setHabits(prev => prev.map(h => {
      if (h.id === habitId) {
        const index = h.completions.indexOf(dateStr);
        const newCompletions = index > -1 
          ? h.completions.filter(d => d !== dateStr) 
          : [...h.completions, dateStr];
        return { ...h, completions: newCompletions };
      }
      return h;
    }));
  };

  const calculateStreak = (completions: string[]) => {
    if (completions.length === 0) return { current: 0, longest: 0 };
    const sorted = [...completions].sort();
    let longest = 0, current = 0, temp = 0;

    let checkDate = startOfDay(new Date());
    while (completions.includes(formatDate(checkDate))) {
      current++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
    
    if (sorted.length > 0) {
      temp = 1;
      for (let i = 1; i < sorted.length; i++) {
        const d1 = startOfDay(new Date(sorted[i-1])), d2 = startOfDay(new Date(sorted[i]));
        if (differenceInDays(d2, d1) === 1) temp++;
        else { longest = Math.max(longest, temp); temp = 1; }
      }
      longest = Math.max(longest, temp);
    }
    return { current, longest };
  };

  const areaData = useMemo(() => daysOfMonth.map(d => {
    const dateStr = formatDate(d);
    let value = 0;
    if (selectedHabit) {
      value = selectedHabit.completions.includes(dateStr) ? 100 : 0;
    } else {
      const hList = habits.filter(h => h.type === 'daily');
      if (hList.length === 0) return { name: format(d, 'd'), value: 0 };
      value = (hList.filter(h => h.completions.includes(dateStr)).length / hList.length) * 100;
    }
    return { name: format(d, 'd'), value };
  }), [daysOfMonth, habits, selectedHabit]);

  const barChartData = useMemo(() => daysOfMonth.map(day => {
    const dateStr = formatDate(day);
    const data: any = { day: format(day, 'd') };
    const filtered = selectedHabit ? [selectedHabit] : habits.filter(h => h.type === 'daily');
    filtered.forEach(h => {
      data[h.id] = h.completions.includes(dateStr) ? 1 : 0;
    });
    return data;
  }), [daysOfMonth, habits, selectedHabit]);

  const timeframeProgress = useMemo(() => {
    let start, end;
    const hList = selectedHabit ? [selectedHabit] : habits.filter(h => h.type === 'daily');
    if (hList.length === 0) return 0;

    if (progressTimeframe === 'daily') {
      const focusedStr = formatDate(focusedDate);
      const done = hList.filter(h => h.completions.includes(focusedStr)).length;
      const total = hList.length;
      return (done / total) * 100;
    }

    switch (progressTimeframe) {
      case 'weekly': start = startOfWeek(focusedDate); end = focusedDate; break;
      case 'monthly': start = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1); end = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, 0); break;
      case 'yearly': start = startOfYear(focusedDate); end = focusedDate; break;
      default: start = focusedDate; end = focusedDate;
    }
    
    const interval = { start: startOfDay(start), end: startOfDay(end) };
    let doneTotal = 0, targetTotal = 0;

    hList.forEach(h => {
      doneTotal += h.completions.filter(c => isWithinInterval(startOfDay(new Date(c)), interval)).length;
      if (progressTimeframe === 'weekly') targetTotal += 7;
      else if (progressTimeframe === 'monthly') targetTotal += h.goal;
      else if (progressTimeframe === 'yearly') targetTotal += h.goal * 12;
    });

    return targetTotal > 0 ? (doneTotal / targetTotal) * 100 : 0;
  }, [habits, selectedHabit, progressTimeframe, focusedDate]);

  const topDaily = useMemo(() => [...habits].filter(h => h.type === 'daily').map(h => ({ name: h.name, percent: Math.round((h.completions.filter(d => isSameMonth(new Date(d), currentDate)).length / daysOfMonth.length) * 100) })).sort((a, b) => b.percent - a.percent).slice(0, 10), [habits, daysOfMonth, currentDate]);
  const topWeekly = useMemo(() => [...habits].filter(h => h.type === 'weekly').map(h => ({ name: h.name, percent: Math.round((h.completions.length / h.goal) * 100) })).sort((a, b) => b.percent - a.percent).slice(0, 3), [habits]);

  const openModal = (type: 'daily' | 'weekly') => {
    setModalHabitType(type);
    setNewHabitName('');
    setNewHabitColor(HABIT_COLORS[habits.length % HABIT_COLORS.length]);
    setNewHabitGoal(type === 'daily' ? daysOfMonth.length : weeksOfMonth.length);
    setIsModalOpen(true);
  };

  const maxAllowedGoal = useMemo(() => modalHabitType === 'daily' ? daysOfMonth.length : weeksOfMonth.length, [modalHabitType, daysOfMonth, weeksOfMonth]);
  const currentColor = selectedHabit?.color || THEME.accent;
  const dailyHabits = habits.filter(h => h.type === 'daily');
  const weeklyHabits = habits.filter(h => h.type === 'weekly');

  return (
    <div className="min-h-screen bg-[#0a0e1a] p-3 sm:p-6 space-y-4 sm:space-y-6 text-slate-300">
      
      {/* ROW 1: HEADER & TOP STATS */}
      <div className="grid grid-cols-12 gap-3 sm:gap-6 items-stretch">
        <div className="col-span-12 lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="bg-[#1f2a40] p-5 sm:p-6 text-center border-l-4 border-[#4cceac] rounded-lg shadow-[0_0_20px_rgba(76,206,172,0.1)]">
            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-tighter">GT TRACKER</h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-[0.2em]">{format(currentDate, 'MMMM yyyy')}</p>
          </div>
          
          <div className="bg-[#1f2a40] p-4 border border-[#333b52] rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => setCurrentDate(addMonths(currentDate, -1))} className="p-2 bg-[#141b2d] rounded-lg hover:text-[#4cceac] transition-all"><ChevronLeft size={18}/></button>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{format(currentDate, 'MMM')}</span>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-[#141b2d] rounded-lg hover:text-[#4cceac] transition-all"><ChevronRight size={18}/></button>
            </div>
            <div className="space-y-2 text-[10px] font-bold">
              <div className="flex justify-between items-center text-slate-500">Year <span className="text-white bg-[#141b2d] px-3 py-1 rounded">{format(currentDate, 'yyyy')}</span></div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 bg-[#1f2a40] p-3 sm:p-4 border border-[#333b52] rounded-lg shadow-lg relative overflow-hidden group">
          <div className="absolute top-2 right-4 text-[9px] font-black uppercase z-10" style={{ color: currentColor }}>
            {selectedHabit ? `Focus: ${selectedHabit.name}` : 'Combined Daily Progress'}
          </div>
          <div className="h-[180px] sm:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentColor} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={currentColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333b52" />
                <XAxis dataKey="name" hide /><YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid #333b52', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="value" stroke={currentColor} strokeWidth={3} fill="url(#areaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 bg-[#1f2a40] p-4 border border-[#333b52] rounded-lg flex flex-col items-center justify-center relative">
          <div className="relative w-28 h-28 sm:w-36 sm:h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[{ value: timeframeProgress }, { value: 100 - timeframeProgress }]} innerRadius="70%" outerRadius="85%" paddingAngle={0} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                  <Cell fill={currentColor} className="drop-shadow-[0_0_8px_rgba(76,206,172,0.4)]" /><Cell fill="#141b2d" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl sm:text-2xl font-black text-white">{Math.round(timeframeProgress)}%</span>
              <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">
                {progressTimeframe === 'daily' ? format(focusedDate, 'MMM dd') : progressTimeframe}
              </span>
            </div>
          </div>
          <div className="flex w-full bg-[#141b2d] rounded-lg mt-4 p-1">
            {(['daily', 'weekly', 'monthly', 'yearly'] as Timeframe[]).map(tf => (
              <button 
                key={tf} 
                onClick={() => setProgressTimeframe(tf)} 
                className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-md transition-all ${progressTimeframe === tf ? 'text-[#141b2d]' : 'text-slate-500'}`}
                style={progressTimeframe === tf ? { backgroundColor: currentColor } : {}}
              >
                {tf.charAt(0)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ROW 2: DETAILED GRAPHS */}
      <div className="grid grid-cols-12 gap-3 sm:gap-6">
        <div className="col-span-12 lg:col-span-8 bg-[#1f2a40] p-4 border border-[#333b52] rounded-lg flex flex-col">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-[10px] font-black text-white uppercase tracking-widest">Efficiency Chart</h2>
             <div className="flex gap-2">
               {weeksOfMonth.map((_, i) => <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedHabit ? selectedHabit.color : THEME.weekColors[i % 5] }} />)}
             </div>
          </div>
          <div className="flex-1 min-h-[180px] sm:min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333b52" />
                <XAxis dataKey="day" hide />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#141b2d', border: '1px solid #333b52', borderRadius: '8px' }}
                />
                {selectedHabit ? (
                  <Bar dataKey={selectedHabit.id} stackId="a" fill={selectedHabit.color} radius={[4, 4, 0, 0]} />
                ) : (
                  dailyHabits.map(h => (
                    <Bar key={h.id} dataKey={h.id} name={h.name} stackId="a" fill={h.color} />
                  ))
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between px-1 text-[7px] font-bold text-slate-500 mt-2">
            {daysOfMonth.map((d, i) => (
              <div 
                key={i} 
                onClick={() => handleDayFocus(d)}
                className={`flex-1 text-center cursor-pointer transition-colors hover:text-white ${isSameDay(d, focusedDate) ? 'text-[#4cceac] font-black scale-110' : ''}`}
              >
                {format(d, 'd')}
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 bg-[#1f2a40] p-4 border border-[#333b52] rounded-lg">
          <h3 className="text-[10px] font-black text-[#4cceac] uppercase mb-4 tracking-widest text-center">Top Performers</h3>
          <div className="space-y-3">
            {topDaily.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 w-4">{i+1}</span>
                  <span className="text-white uppercase truncate max-w-[120px]">{h.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 bg-[#141b2d] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4cceac]" style={{ width: `${h.percent}%` }} />
                  </div>
                  <span className="w-8 text-right text-[#4cceac]">{h.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DAILY HABITS TABLE */}
      <div className="bg-[#1f2a40] border border-[#333b52] rounded-lg overflow-hidden shadow-2xl">
        <div 
          onClick={() => setSelectedHabitId(null)}
          className="p-4 bg-[#141b2d] flex justify-between items-center cursor-pointer active:bg-[#1a233a] transition-colors"
        >
           <h3 className="text-[10px] font-black uppercase text-white tracking-widest flex items-center gap-2">
             Mission Control (Daily)
             <span className="hidden sm:inline text-[8px] text-[#4cceac] opacity-50">(Combined View)</span>
           </h3>
           <button onClick={(e) => { e.stopPropagation(); openModal('daily'); }} className="bg-[#4cceac] text-[#141b2d] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(76,206,172,0.3)]">+ Add Mission</button>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px] sm:min-w-[1400px]">
            <thead>
              <tr className="bg-[#141b2d]/50 text-[9px] font-black text-slate-500 uppercase border-b border-slate-700">
                <th className="p-4 w-40 sticky left-0 bg-[#1f2a40] z-20 border-r border-slate-800">Habit Name</th>
                <th className="p-4 w-12 text-center">Goal</th>
                {weeksOfMonth.map((w, idx) => (
                  <th key={idx} className="border-l border-slate-800">
                    <div className="text-center py-2 text-[8px] border-b border-slate-800/50" style={{ color: THEME.weekColors[idx % 5] }}>Week {idx + 1}</div>
                    <div className="flex">
                      {daysOfMonth.filter(d => isWithinInterval(d, w)).map((d, i) => {
                        const isFocused = isSameDay(d, focusedDate);
                        return (
                          <div 
                            key={i} 
                            onClick={() => handleDayFocus(d)}
                            className={`w-8 text-center py-1.5 flex flex-col items-center cursor-pointer transition-colors ${isFocused ? 'bg-[#4cceac]/10' : ''}`}
                          >
                             <span className={`text-[6px] ${isFocused ? 'text-[#4cceac] font-black' : 'text-slate-600'}`}>{format(d, 'EE').toUpperCase()}</span>
                             <span className={`text-[8px] ${isFocused ? 'text-[#4cceac] font-black scale-125' : 'text-white'}`}>{format(d, 'd')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </th>
                ))}
                <th className="border-l border-slate-800 w-[300px] p-0">
                  <div className="flex h-full text-[7px] font-black uppercase text-center items-stretch">
                    <div className="w-10 border-r border-slate-800 flex items-center justify-center">Done</div>
                    <div className="w-10 border-r border-slate-800 flex items-center justify-center text-red-400">Left</div>
                    <div className="flex-1 border-r border-slate-800 flex items-center justify-center">Progress</div>
                    <div className="w-24 flex flex-col">
                      <div className="flex-1 border-b border-slate-800/50 flex items-center justify-center">Streaks</div>
                      <div className="flex-1 flex items-center justify-around font-black text-[6px]">
                        <span className="text-slate-400">CURR</span>
                        <span className="text-[#4cceac]">BEST</span>
                      </div>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {dailyHabits.map(habit => {
                const completionsCount = habit.completions.filter(d => isSameMonth(new Date(d), currentDate)).length;
                const remaining = Math.max(0, habit.goal - completionsCount);
                const { current, longest } = calculateStreak(habit.completions);
                const pct = Math.round((completionsCount / habit.goal) * 100) || 0;
                const isSelected = selectedHabitId === habit.id;
                return (
                  <tr key={habit.id} className={`group cursor-pointer transition-colors ${isSelected ? 'bg-[#4cceac]/5' : 'hover:bg-white/[0.01]'}`} onClick={() => setSelectedHabitId(habit.id)}>
                    <td className={`p-4 font-black text-xs uppercase sticky left-0 z-10 border-r border-slate-800 flex justify-between items-center shadow-xl ${isSelected ? 'bg-[#25324d]' : 'bg-[#1f2a40]'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: habit.color }} />
                        <span className={isSelected ? 'text-[#4cceac]' : 'text-white'}>{habit.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setHabits(habits.filter(x => x.id !== habit.id)); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={12}/></button>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-500 border-l border-slate-800">{habit.goal}</td>
                    {weeksOfMonth.map((w, wIdx) => (
                      <td key={wIdx} className="p-0 border-l border-slate-800">
                        <div className="flex">
                          {daysOfMonth.filter(d => isWithinInterval(d, w)).map((d, i) => {
                            const active = habit.completions.includes(formatDate(d));
                            const isFocused = isSameDay(d, focusedDate);
                            return (
                              <div key={i} onClick={(e) => { e.stopPropagation(); toggleHabit(habit.id, d); }} className={`w-8 h-12 flex items-center justify-center group/cell ${isFocused ? 'bg-[#4cceac]/5' : ''}`}>
                                <div className={`w-5 h-5 border rounded-md flex items-center justify-center transition-all ${active ? 'border-transparent shadow-[0_0_10px]' : 'border-slate-700 bg-[#141b2d]/50'} ${isFocused && !active ? 'border-[#4cceac]/30' : ''}`} style={active ? { backgroundColor: habit.color, color: habit.color } : {}}>
                                  {active && <Check size={12} className="text-[#0a0e1a] stroke-[4px]" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    ))}
                    <td className="p-0 border-l border-slate-800 bg-[#141b2d]/20">
                      <div className="flex h-12 w-full items-stretch">
                        <div className="w-10 flex items-center justify-center font-black text-xs" style={{ color: habit.color }}>{completionsCount}</div>
                        <div className="w-10 flex items-center justify-center font-black text-xs text-red-500/70 border-l border-slate-800/30">{remaining}</div>
                        <div className="flex-1 px-3 flex flex-col justify-center border-l border-slate-800/30">
                           <div className="h-1.5 w-full bg-[#141b2d] rounded-full overflow-hidden">
                             <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: habit.color }} />
                           </div>
                        </div>
                        <div className="w-24 flex font-black text-[10px] items-stretch border-l border-slate-800/30">
                           <div className="flex-1 flex items-center justify-center text-white border-r border-slate-800/30">{current}</div>
                           <div className="flex-1 flex items-center justify-center" style={{ color: habit.color }}>{longest}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* WEEKLY HABITS TABLE */}
      <div className="bg-[#1f2a40] border border-[#333b52] rounded-lg overflow-hidden shadow-2xl mt-6">
        <div className="p-4 bg-[#141b2d] flex justify-between items-center">
           <h3 className="text-[10px] font-black uppercase text-white tracking-widest">Macro Targets (Weekly)</h3>
           <button onClick={() => openModal('weekly')} className="bg-[#4cceac] text-[#141b2d] px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(76,206,172,0.3)]">+ Add Macro</button>
        </div>
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px] sm:min-w-[1400px]">
            <thead>
              <tr className="bg-[#141b2d]/50 text-[9px] font-black text-slate-500 uppercase border-b border-slate-700">
                <th className="p-4 w-40 sticky left-0 bg-[#1f2a40] z-20 border-r border-slate-800">Macro Habit</th>
                <th className="p-4 w-12 text-center">Goal</th>
                {weeksOfMonth.map((w, idx) => {
                  const isFocusedWeek = isWithinInterval(focusedDate, w);
                  return (
                    <th 
                      key={idx} 
                      onClick={() => handleDayFocus(w.start)}
                      className={`border-l border-slate-800 text-center py-3 text-[10px] uppercase font-black cursor-pointer transition-colors ${isFocusedWeek ? 'bg-[#4cceac]/10' : ''}`} 
                      style={{ color: isFocusedWeek ? '#4cceac' : THEME.weekColors[idx % 5] }}
                    >
                      Week {idx + 1}
                    </th>
                  );
                })}
                <th className="border-l border-slate-800 w-[240px] p-0">
                   <div className="flex h-full text-[7px] font-black uppercase text-center items-stretch">
                    <div className="w-10 border-r border-slate-800 flex items-center justify-center">Done</div>
                    <div className="w-10 border-r border-slate-800 flex items-center justify-center text-red-400">Left</div>
                    <div className="flex-1 flex items-center justify-center">Progress</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {weeklyHabits.map(habit => {
                const doneCount = habit.completions.length;
                const remaining = Math.max(0, habit.goal - doneCount);
                const pct = Math.round((doneCount / habit.goal) * 100) || 0;
                return (
                  <tr key={habit.id} className="group hover:bg-white/[0.01] cursor-pointer">
                    <td className="p-4 font-black text-xs uppercase sticky left-0 z-10 border-r border-slate-800 bg-[#1f2a40] flex justify-between items-center shadow-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]" style={{ backgroundColor: habit.color }} />
                        <span className="text-white">{habit.name}</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setHabits(habits.filter(x => x.id !== habit.id)); }} className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-red-400 transition-all"><Trash2 size={12}/></button>
                    </td>
                    <td className="p-4 text-center font-bold text-slate-500 border-l border-slate-800">{habit.goal}</td>
                    {weeksOfMonth.map((w, idx) => {
                      const active = habit.completions.some(c => isWithinInterval(startOfDay(new Date(c)), w));
                      const isFocusedWeek = isWithinInterval(focusedDate, w);
                      return (
                        <td key={idx} onClick={() => toggleHabit(habit.id, w.start)} className={`p-0 border-l border-slate-800 ${isFocusedWeek ? 'bg-[#4cceac]/5' : ''}`}>
                           <div className="flex items-center justify-center h-12 group/cell">
                              <div className={`w-6 h-6 border rounded-md flex items-center justify-center transition-all ${active ? 'border-transparent shadow-[0_0_10px]' : 'border-slate-700 bg-[#141b2d]/50 group-hover/cell:border-slate-500'} ${isFocusedWeek && !active ? 'border-[#4cceac]/30' : ''}`} style={active ? { backgroundColor: habit.color, color: habit.color } : {}}>
                                {active && <Check size={16} className="text-[#0a0e1a] stroke-[4px]" />}
                              </div>
                           </div>
                        </td>
                      );
                    })}
                    <td className="p-0 border-l border-slate-800 bg-[#141b2d]/20">
                      <div className="flex h-12 w-full items-stretch">
                         <div className="w-10 flex items-center justify-center font-black text-xs" style={{ color: habit.color }}>{doneCount}</div>
                         <div className="w-10 flex items-center justify-center font-black text-xs text-red-500/70 border-l border-slate-800/30">{remaining}</div>
                         <div className="flex-1 px-3 flex flex-col justify-center border-l border-slate-800/30">
                            <div className="h-1.5 w-full bg-[#141b2d] rounded-full overflow-hidden">
                              <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: habit.color }} />
                            </div>
                         </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1f2a40] border border-[#333b52] w-full max-w-sm p-6 sm:p-8 shadow-2xl rounded-2xl transform transition-all animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-3"><Plus className="text-[#4cceac]"/>New {modalHabitType === 'daily' ? 'Daily Mission' : 'Macro Target'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X /></button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Habit Name</label>
                <input type="text" value={newHabitName} onChange={e => setNewHabitName(e.target.value)} className="w-full bg-[#141b2d] border border-[#333b52] p-4 text-white outline-none focus:border-[#4cceac] rounded-xl font-bold" placeholder="E.G. HYDRATION" autoFocus />
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Aura Color</label>
                <div className="grid grid-cols-5 gap-3">
                  {HABIT_COLORS.map(color => (
                    <button 
                      key={color} 
                      onClick={() => setNewHabitColor(color)} 
                      className={`h-8 w-8 rounded-lg border-2 transition-all ${newHabitColor === color ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.4)]' : 'border-transparent opacity-40'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                  Target {modalHabitType === 'daily' ? 'Monthly' : 'Macro'} Goal
                </label>
                <div className="flex items-center gap-4 bg-[#141b2d] p-1 rounded-xl border border-[#333b52]">
                  <input 
                    type="range" 
                    min="1" 
                    max={maxAllowedGoal} 
                    value={newHabitGoal} 
                    onChange={e => setNewHabitGoal(parseInt(e.target.value))}
                    className="flex-1 h-1.5 ml-3 accent-[#4cceac] bg-[#1f2a40] rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 text-center font-black text-white text-sm mr-2">{newHabitGoal}</div>
                </div>
              </div>

              <button 
                onClick={() => { 
                  if (newHabitName) { 
                    setHabits([...habits, { id: generateId(), name: newHabitName, goal: newHabitGoal, color: newHabitColor, completions: [], type: modalHabitType }]); 
                    setIsModalOpen(false); 
                  } 
                }} 
                className="w-full text-[#141b2d] font-black py-5 mt-4 rounded-xl uppercase tracking-[0.2em] text-xs shadow-lg transition-all active:scale-95"
                style={{ backgroundColor: newHabitColor }}
              >
                Initiate {modalHabitType === 'daily' ? 'Mission' : 'Macro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
