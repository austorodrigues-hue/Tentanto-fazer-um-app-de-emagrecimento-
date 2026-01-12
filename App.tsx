
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, DailyStats, LoggedFood, FoodItem } from './types';
import { FOOD_DATABASE } from './constants';

type Tab = 'dashboard' | 'exercises';

interface CustomExercise {
  id: string;
  name: string;
  sets: string;
  tip: string;
}

const App: React.FC = () => {
  // --- ESTADO INICIAL ---
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [dailyStats, setDailyStats] = useState<DailyStats & { completedExercises: string[] }>({
    waterDrank: 0,
    foods: [],
    completedExercises: [],
  });
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string>('');
  
  const [selectedGoal, setSelectedGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [showAddFoodForm, setShowAddFoodForm] = useState(false);

  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('');
  const [newExTip, setNewExTip] = useState('');

  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodCals, setNewFoodCals] = useState('');

  // --- PERSISTÊNCIA (LOCALSTORAGE) ---
  useEffect(() => {
    const storedUser = localStorage.getItem('fitfocus_user');
    const storedStats = localStorage.getItem('fitfocus_stats');
    const storedTheme = localStorage.getItem('fitfocus_theme');
    const storedCustomEx = localStorage.getItem('fitfocus_custom_exercises');
    const storedCustomFoods = localStorage.getItem('fitfocus_custom_foods');
    const storedResetDate = localStorage.getItem('fitfocus_last_reset');

    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setSelectedGoal(u.goal);
    }
    if (storedStats) {
      const parsedStats = JSON.parse(storedStats);
      setDailyStats({
        waterDrank: parsedStats.waterDrank || 0,
        foods: parsedStats.foods || [],
        completedExercises: parsedStats.completedExercises || []
      });
    }
    if (storedCustomEx) setCustomExercises(JSON.parse(storedCustomEx));
    if (storedCustomFoods) setCustomFoods(JSON.parse(storedCustomFoods));
    if (storedResetDate) setLastResetDate(storedResetDate);
    
    if (storedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Reset Diário (Baseado na Data do Dispositivo)
  useEffect(() => {
    const today = new Date().toLocaleDateString();
    if (lastResetDate && lastResetDate !== today && user) {
      const resetStats = {
        waterDrank: 0,
        foods: [],
        completedExercises: [],
      };
      setDailyStats(resetStats);
      setLastResetDate(today);
      localStorage.setItem('fitfocus_last_reset', today);
      localStorage.setItem('fitfocus_stats', JSON.stringify(resetStats));
    } else if (!lastResetDate) {
      setLastResetDate(today);
      localStorage.setItem('fitfocus_last_reset', today);
    }
  }, [lastResetDate, user]);

  // Salvar alterações automaticamente
  useEffect(() => {
    if (user) localStorage.setItem('fitfocus_user', JSON.stringify(user));
    localStorage.setItem('fitfocus_stats', JSON.stringify(dailyStats));
    localStorage.setItem('fitfocus_custom_exercises', JSON.stringify(customExercises));
    localStorage.setItem('fitfocus_custom_foods', JSON.stringify(customFoods));
    localStorage.setItem('fitfocus_theme', isDarkMode ? 'dark' : 'light');
  }, [user, dailyStats, customExercises, customFoods, isDarkMode]);

  // --- LÓGICA DE LOGOUT ---
  const handleLogout = () => {
    // Confirmação para evitar cliques acidentais
    if (window.confirm("Deseja realmente sair e resetar seus dados?")) {
      setUser(null);
      setDailyStats({ waterDrank: 0, foods: [], completedExercises: [] });
      setCustomExercises([]);
      setCustomFoods([]);
      setActiveTab('dashboard');
      setSearchTerm('');
      
      // Limpa LocalStorage
      localStorage.removeItem('fitfocus_user');
      localStorage.removeItem('fitfocus_stats');
      localStorage.removeItem('fitfocus_custom_exercises');
      localStorage.removeItem('fitfocus_custom_foods');
      localStorage.removeItem('fitfocus_last_reset');
    }
  };

  // --- CÁLCULOS ---
  const bmi = useMemo(() => {
    if (!user) return 0;
    const heightInMeters = user.height / 100;
    return user.weight / (heightInMeters * heightInMeters);
  }, [user]);

  const calorieTarget = useMemo(() => {
    if (!user) return 2000;
    let bmr = user.gender === 'male' 
      ? (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5
      : (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;
    
    const tdee = bmr * 1.375; // Nível de atividade moderada por padrão
    if (user.goal === 'maintain' || !user.targetChangeKg || !user.durationWeeks) return Math.round(tdee);

    const totalKcalToChange = user.targetChangeKg * 7700;
    const dailyAdjustment = totalKcalToChange / (user.durationWeeks * 7);
    
    let target = user.goal === 'lose' ? tdee - dailyAdjustment : tdee + dailyAdjustment;
    const safetyFloor = user.gender === 'female' ? 1200 : 1500;
    return Math.max(Math.round(target), safetyFloor);
  }, [user]);

  const totalCaloriesConsumed = useMemo(() => {
    return dailyStats.foods.reduce((sum, food) => sum + food.calories, 0);
  }, [dailyStats.foods]);

  const waterTarget = useMemo(() => {
    if (!user) return 2000;
    return Math.round(user.weight * 35);
  }, [user]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  // --- HANDLERS ---
  const handleOnboarding = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const goal = formData.get('goal') as 'lose' | 'maintain' | 'gain';
    const newUser: UserProfile = {
      name: String(formData.get('name')),
      weight: Number(formData.get('weight')),
      height: Number(formData.get('height')),
      age: Number(formData.get('age')),
      gender: formData.get('gender') as 'male' | 'female',
      goal,
      targetChangeKg: goal !== 'maintain' ? Number(formData.get('targetChangeKg')) : undefined,
      durationWeeks: goal !== 'maintain' ? Number(formData.get('durationWeeks')) : undefined,
    };
    setUser(newUser);
    setLastResetDate(new Date().toLocaleDateString());
  };

  const addFoodToLog = (food: FoodItem) => {
    const newLog: LoggedFood = {
      id: Math.random().toString(36).substr(2, 9),
      foodId: food.id,
      name: food.name,
      calories: food.calories,
      timestamp: Date.now(),
    };
    setDailyStats(prev => ({ ...prev, foods: [newLog, ...prev.foods] }));
    setSearchTerm('');
  };

  const removeFoodFromLog = (id: string) => {
    setDailyStats(prev => ({ ...prev, foods: prev.foods.filter(f => f.id !== id) }));
  };

  const toggleExercise = (name: string) => {
    setDailyStats(prev => {
      const isCompleted = prev.completedExercises.includes(name);
      return {
        ...prev,
        completedExercises: isCompleted
          ? prev.completedExercises.filter(e => e !== name)
          : [...prev.completedExercises, name]
      };
    });
  };

  const removeCustomExercise = (id: string) => {
    setCustomExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleAddCustomExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName || !newExSets) return;
    const newEx: CustomExercise = {
      id: Math.random().toString(36).substr(2, 9),
      name: newExName,
      sets: newExSets,
      tip: newExTip || 'Exercício personalizado'
    };
    setCustomExercises(prev => [...prev, newEx]);
    setNewExName('');
    setNewExSets('');
    setNewExTip('');
  };

  const addCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodName || !newFoodCals) return;
    const food: FoodItem = {
      id: 'custom_' + Math.random().toString(36).substr(2, 9),
      name: newFoodName,
      calories: Number(newFoodCals),
      unit: 'unidade/100g'
    };
    setCustomFoods(prev => [food, ...prev]);
    setNewFoodName('');
    setNewFoodCals('');
    setShowAddFoodForm(false);
  };

  const exerciseRoutine = useMemo(() => {
    if (!user) return null;
    if (bmi >= 30) {
      return {
        level: 'Foco em Emagrecimento',
        calisthenics: [
          { name: 'Sentar e Levantar', sets: '3x15', tip: 'Use uma cadeira estável.' },
          { name: 'Flexão na Parede', sets: '3x12', tip: 'Mãos na altura dos ombros.' },
          { name: 'Marcha Estacionária', sets: '3x1min', tip: 'Levante bem os joelhos.' },
          { name: 'Elevação de Panturrilha', sets: '3x20', tip: 'Segure na parede para equilíbrio.' }
        ],
        cardio: { name: 'Caminhada Rápida', duration: '30 min', target: 'Queima de gordura' }
      };
    } else if (bmi < 18.5) {
      return {
        level: 'Ganho de Massa',
        calisthenics: [
          { name: 'Agachamento Livre', sets: '4x10', tip: 'Pés na largura dos ombros.' },
          { name: 'Flexão de Braços', sets: '3x Max', tip: 'Mantenha o core contraído.' },
          { name: 'Barra Fixa (ou Remada)', sets: '3x8', tip: 'Foco na subida explosiva.' },
          { name: 'Afundo', sets: '3x10 cada perna', tip: 'Não deixe o joelho passar o pé.' }
        ],
        cardio: { name: 'Corrida Leve', duration: '15 min', target: 'Saúde vascular' }
      };
    } else {
      return {
        level: 'Manutenção e Definição',
        calisthenics: [
          { name: 'Burpees', sets: '3x10', tip: 'Mantenha o ritmo constante.' },
          { name: 'Agachamento com Salto', sets: '3x12', tip: 'Pouse suavemente.' },
          { name: 'Prancha Abdominal', sets: '3x45s', tip: 'Não deixe o quadril cair.' },
          { name: 'Escalador (Mountain Climber)', sets: '3x30s', tip: 'Mãos firmes no chão.' }
        ],
        cardio: { name: 'Corrida Moderada', duration: '25 min', target: 'Resistência' }
      };
    }
  }, [user, bmi]);

  const allAvailableFoods = useMemo(() => {
    if (!searchTerm) return [];
    const search = searchTerm.toLowerCase();
    return [...customFoods, ...FOOD_DATABASE]
      .filter(f => f.name.toLowerCase().includes(search))
      .slice(0, 8);
  }, [searchTerm, customFoods]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-24 md:pb-0 transition-colors">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-none">
              <span className="text-white font-black text-xs">FF</span>
            </div>
            <h1 className="font-bold text-xl">FitFocus</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleDarkMode} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                {isDarkMode ? <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg> : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>}
            </button>
            {user && (
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl flex items-center gap-2" title="Sair do Perfil">
                <span className="text-xs font-bold hidden sm:block">Sair</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {!user ? (
        <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 dark:border-slate-800 animate-fade-in">
            <h1 className="text-3xl font-black mb-2 text-slate-800 dark:text-white text-center">FitFocus</h1>
            <p className="text-slate-500 mb-8 text-center">O seu assistente estático de saúde.</p>
            <form onSubmit={handleOnboarding} className="space-y-4">
              <input name="name" required placeholder="Seu Nome" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white" />
              <div className="grid grid-cols-2 gap-4">
                <input name="weight" type="number" required placeholder="Peso (kg)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white" />
                <input name="height" type="number" required placeholder="Altura (cm)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="age" type="number" required placeholder="Idade" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white" />
                <select name="gender" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white">
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>
              <select name="goal" value={selectedGoal} onChange={e => setSelectedGoal(e.target.value as any)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white">
                <option value="lose">Perder Peso</option>
                <option value="maintain">Manter Peso</option>
                <option value="gain">Ganhar Massa</option>
              </select>
              {selectedGoal !== 'maintain' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in">
                  <input name="targetChangeKg" type="number" required placeholder="Meta (kg)" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white" />
                  <input name="durationWeeks" type="number" required placeholder="Semanas" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-white" />
                </div>
              )}
              <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-200 dark:shadow-none hover:bg-emerald-600 transition">GERAR PLANO</button>
            </form>
          </div>
        </div>
      ) : (
        <main className="max-w-6xl mx-auto px-4 py-8">
          {activeTab === 'dashboard' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
              <div className="lg:col-span-8 space-y-8">
                {/* Calorias */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black">Resumo Nutricional</h2>
                    <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold">Meta: {calorieTarget} kcal</div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-10">
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                        <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 85} strokeDashoffset={2 * Math.PI * 85 * (1 - Math.min(totalCaloriesConsumed / calorieTarget, 1))} className="text-emerald-500 transition-all duration-1000" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black">{totalCaloriesConsumed}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">kcal</span>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-2"><span>Restante</span><span>{Math.max(0, calorieTarget - totalCaloriesConsumed)} kcal</span></div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.min((totalCaloriesConsumed / calorieTarget) * 100, 100)}%` }}></div></div>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center justify-between">
                        <span>IMC: <span className="font-bold text-slate-700 dark:text-slate-300">{bmi.toFixed(1)}</span></span>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">Status: {bmi < 18.5 ? 'Abaixo' : bmi < 25 ? 'Normal' : 'Acima'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Registro */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <h2 className="text-lg font-bold">Refeições do Dia</h2>
                    <button onClick={() => setShowAddFoodForm(!showAddFoodForm)} className="text-xs font-bold text-emerald-500 hover:underline">+ Criar Alimento Personalizado</button>
                  </div>

                  {showAddFoodForm && (
                    <form onSubmit={addCustomFood} className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={newFoodName} onChange={e => setNewFoodName(e.target.value)} placeholder="Nome" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-xl text-sm" required />
                      <input value={newFoodCals} onChange={e => setNewFoodCals(e.target.value)} type="number" placeholder="Kcal" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-xl text-sm" required />
                      <button type="submit" className="bg-emerald-500 text-white font-bold rounded-xl text-xs py-2">Salvar</button>
                    </form>
                  )}

                  <div className="relative mb-6">
                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar entre +1000 alimentos..." className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm" />
                    <svg className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
                    
                    {searchTerm && allAvailableFoods.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border dark:border-slate-700 z-40 overflow-hidden">
                        {allAvailableFoods.map(f => (
                          <div key={f.id} onClick={() => addFoodToLog(f)} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b dark:border-slate-700 last:border-none">
                            <span className="text-sm">{f.name}</span>
                            <span className="font-bold text-emerald-500 text-sm">{f.calories} kcal</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {dailyStats.foods.map(f => (
                      <div key={f.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex items-center justify-between group border border-slate-100 dark:border-slate-800">
                        <div>
                          <p className="font-bold text-sm">{f.name}</p>
                          <p className="text-[10px] text-slate-400">{new Date(f.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-sm">{f.calories} kcal</span>
                          <button onClick={() => removeFoodFromLog(f.id)} className="text-slate-300 hover:text-red-500 transition">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {dailyStats.foods.length === 0 && <p className="text-center py-8 text-slate-400 text-sm italic">Nenhum registro hoje.</p>}
                  </div>
                </div>
              </div>

              {/* Hidratação Desktop */}
              <div className="hidden lg:block lg:col-span-4">
                <div className="bg-blue-600 dark:bg-blue-700 p-8 rounded-3xl shadow-xl text-white sticky top-24">
                  <h2 className="text-xl font-black mb-6 flex items-center gap-2">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
                    Água
                  </h2>
                  <div className="relative w-32 h-40 bg-blue-500/30 rounded-full mx-auto mb-8 overflow-hidden border-2 border-white/20">
                    <div className="absolute bottom-0 left-0 right-0 bg-white/40 transition-all duration-700" style={{ height: `${Math.min((dailyStats.waterDrank / waterTarget) * 100, 100)}%` }}></div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black">{dailyStats.waterDrank}</span>
                        <span className="text-[10px] font-bold opacity-60">de {waterTarget}ml</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 250}))} className="bg-white/10 py-3 rounded-2xl text-xs font-bold hover:bg-white/20">+250ml</button>
                    <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 500}))} className="bg-white/10 py-3 rounded-2xl text-xs font-bold hover:bg-white/20">+500ml</button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* TREINOS */
            <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
                <div className="mb-8">
                  <h2 className="text-2xl font-black mb-1">Seu Treino Sugerido</h2>
                  <p className="text-slate-500 text-sm">Plano adaptado: <span className="font-bold text-emerald-500">{exerciseRoutine?.level}</span></p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {exerciseRoutine?.calisthenics.map((ex, i) => (
                    <div key={i} onClick={() => toggleExercise(ex.name)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${dailyStats.completedExercises.includes(ex.name) ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'}`}>
                      <div>
                        <p className={`font-bold text-sm ${dailyStats.completedExercises.includes(ex.name) ? 'line-through text-slate-400' : ''}`}>{ex.name}</p>
                        <p className="text-[10px] text-slate-500">{ex.sets} - {ex.tip}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${dailyStats.completedExercises.includes(ex.name) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                        {dailyStats.completedExercises.includes(ex.name) && <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                      </div>
                    </div>
                  ))}
                  {customExercises.map(ex => (
                    <div key={ex.id} onClick={() => toggleExercise(ex.name)} className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${dailyStats.completedExercises.includes(ex.name) ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 opacity-60' : 'bg-white dark:bg-slate-800'}`}>
                      <div>
                        <p className={`font-bold text-sm ${dailyStats.completedExercises.includes(ex.name) ? 'line-through text-slate-400' : ''}`}>{ex.name}</p>
                        <p className="text-[10px] text-slate-500">{ex.sets}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); removeCustomExercise(ex.id); }} className="text-slate-300 hover:text-red-500"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg></button>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${dailyStats.completedExercises.includes(ex.name) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                          {dailyStats.completedExercises.includes(ex.name) && <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Form de Exercício Custom */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">Adicionar Exercício Extra</h3>
                  <form onSubmit={handleAddCustomExercise} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input value={newExName} onChange={e => setNewExName(e.target.value)} placeholder="Nome" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-xl text-xs" required />
                      <input value={newExSets} onChange={e => setNewExSets(e.target.value)} placeholder="Séries/Reps" className="px-3 py-2 bg-white dark:bg-slate-700 rounded-xl text-xs" required />
                      <button type="submit" className="bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs">Adicionar</button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* Nav Mobile */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 flex items-center justify-around h-16">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center ${activeTab === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
            <span className="text-[10px] font-bold">Nutrição</span>
          </button>
          <button onClick={() => setIsWaterModalOpen(true)} className="w-12 h-12 bg-blue-600 text-white rounded-full -mt-6 shadow-xl flex items-center justify-center">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
          </button>
          <button onClick={() => setActiveTab('exercises')} className={`flex flex-col items-center ${activeTab === 'exercises' ? 'text-emerald-500' : 'text-slate-400'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg>
            <span className="text-[10px] font-bold">Treino</span>
          </button>
        </nav>
      )}

      {/* Modal Água Mobile */}
      {isWaterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4">
          <div className="bg-blue-600 w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6 text-white">
                <h2 className="text-xl font-black tracking-tight">Beber Água</h2>
                <button onClick={() => setIsWaterModalOpen(false)} className="p-1 hover:bg-white/10 rounded-lg"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/></svg></button>
            </div>
            <div className="text-center text-white mb-8">
                <div className="text-5xl font-black mb-1">{dailyStats.waterDrank}ml</div>
                <div className="text-[10px] uppercase font-bold opacity-60">Meta: {waterTarget}ml</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 250}))} className="bg-white/20 py-4 rounded-2xl font-bold text-white transition active:scale-95">+250ml</button>
                <button onClick={() => setDailyStats(p => ({...p, waterDrank: p.waterDrank + 500}))} className="bg-white/20 py-4 rounded-2xl font-bold text-white transition active:scale-95">+500ml</button>
                <button onClick={() => setDailyStats(p => ({...p, waterDrank: Math.max(0, p.waterDrank - 250)}))} className="col-span-2 text-white/40 text-[10px] font-bold py-2">Remover 250ml</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
