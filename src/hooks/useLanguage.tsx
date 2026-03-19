import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    newGoal: "New",
    create: "Create",
    cancel: "Cancel",
    logout: "Logout",
    goals: "Goals",
    tasks: "Tasks",
    completed: "Completed",
    progress: "Progress",
    addTask: "Add a new task...",
    generateAI: "Generate Tasks with AI",
    generating: "Generating tasks with AI...",
    reorder: "Reorder Tasks",
    doneReordering: "Done Reordering",
    undo: "Undo",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    notStarted: "Not Started",
    gettingStarted: "Getting Started",
    inProgress: "In Progress",
    almostThere: "Almost There",
    finalStretch: "Final Stretch",
    completedExcl: "Completed!",
    previous: "Previous",
    locked: "Locked",
    // Goal related
    selectGoal: "Select a Goal",
    noGoals: "No goals yet",
    noTasks: "No tasks yet. Add tasks manually or use AI to generate them.",
    deleteGoalConfirm: "Are you sure you want to delete this goal?",
    deleteGoalTitle: "Delete Goal",
    deleteGoalWarning: "All tasks associated with this goal will also be deleted. This action cannot be undone.",
    deleting: "Deleting...",
    // Task related
    completePrevious: "Complete previous tasks first",
    taskDeleted: "Task deleted",
    editTask: "Edit Task",
    editTaskDescription: "Make changes to your task here. Click save when you're done.",
    taskTitle: "Task Title",
    enterTaskTitle: "Enter task title...",
    estimatedTime: "Estimated Time (minutes)",
    saveChanges: "Save Changes",
    saving: "Saving...",
    // Auth
    signIn: "Sign In",
    signUp: "Sign Up",
    createAccount: "Create Account",
    enterCredentials: "Enter your credentials to access your account",
    enterDetails: "Enter your details to create a new account",
    email: "Email",
    password: "Password",
    signingIn: "Signing in...",
    creatingAccount: "Creating account...",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    signUpLink: "Sign up",
    signInLink: "Sign in",
    termsAgreement: "By signing in, you agree to our Terms of Service and Privacy Policy.",
    continueWithGoogle: "Continue with Google",
    // AI Refiner
    aiTaskRefiner: "AI Task Refiner",
    refinePlaceholder: "Ask AI to refine your tasks (e.g., 'Add more detail to step 3')...",
    // Completion
    congratulations: "Congratulations!",
    goalCompleted: "You've completed all tasks for this goal!",
    // Error
    somethingWentWrong: "Something went wrong",
    refreshPage: "Refresh Page",
    // Undo
    taskDeletedUndo: "Task deleted. Click undo to restore.",
  },
  id: {
    // Common
    newGoal: "Baru",
    create: "Buat",
    cancel: "Batal",
    logout: "Keluar",
    goals: "Tujuan",
    tasks: "Tugas",
    completed: "Selesai",
    progress: "Kemajuan",
    addTask: "Tambah tugas baru...",
    generateAI: "Generate Tugas dengan AI",
    generating: "Membuat tugas dengan AI...",
    reorder: "Urus Ulang Tugas",
    doneReordering: "Selesai Urus Ulang",
    undo: "Batalkan",
    delete: "Hapus",
    edit: "Edit",
    save: "Simpan",
    notStarted: "Belum Dimulai",
    gettingStarted: "Memulai",
    inProgress: "Sedang Berlangsung",
    almostThere: "Hampir Selesai",
    finalStretch: "Tahap Akhir",
    completedExcl: "Selesai!",
    previous: "Sebelumnya",
    locked: "Terkunci",
    // Goal related
    selectGoal: "Pilih Tujuan",
    noGoals: "Belum ada tujuan",
    noTasks: "Belum ada tugas. Tambahkan tugas manual atau gunakan AI untuk membuatnya.",
    deleteGoalConfirm: "Apakah Anda yakin ingin menghapus tujuan ini?",
    deleteGoalTitle: "Hapus Tujuan",
    deleteGoalWarning: "Semua tugas yang terkait dengan tujuan ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.",
    deleting: "Menghapus...",
    // Task related
    completePrevious: "Selesaikan tugas sebelumnya terlebih dahulu",
    taskDeleted: "Tugas dihapus",
    editTask: "Edit Tugas",
    editTaskDescription: "Buat perubahan pada tugas Anda di sini. Klik simpan ketika selesai.",
    taskTitle: "Judul Tugas",
    enterTaskTitle: "Masukkan judul tugas...",
    estimatedTime: "Perkiraan Waktu (menit)",
    saveChanges: "Simpan Perubahan",
    saving: "Menyimpan...",
    // Auth
    signIn: "Masuk",
    signUp: "Daftar",
    createAccount: "Buat Akun",
    enterCredentials: "Masukkan kredensial Anda untuk mengakses akun",
    enterDetails: "Masukkan detail Anda untuk membuat akun baru",
    email: "Email",
    password: "Kata Sandi",
    signingIn: "Sedang masuk...",
    creatingAccount: "Membuat akun...",
    noAccount: "Belum punya akun?",
    haveAccount: "Sudah punya akun?",
    signUpLink: "Daftar",
    signInLink: "Masuk",
    termsAgreement: "Dengan masuk, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.",
    continueWithGoogle: "Lanjutkan dengan Google",
    // AI Refiner
    aiTaskRefiner: "AI Penyempurna Tugas",
    refinePlaceholder: "Minta AI untuk menyempurnakan tugas Anda (contoh: 'Tambahkan detail pada langkah 3')...",
    // Completion
    congratulations: "Selamat!",
    goalCompleted: "Anda telah menyelesaikan semua tugas untuk tujuan ini!",
    // Error
    somethingWentWrong: "Terjadi kesalahan",
    refreshPage: "Muat Ulang Halaman",
    // Undo
    taskDeletedUndo: "Tugas dihapus. Klik batalkan untuk memulihkan.",
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Try to get from localStorage on initial load
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("smarttask-language") as Language;
      return saved === "id" ? "id" : "en";
    }
    return "en";
  });

  // Sync with localStorage on mount (for SSR compatibility)
  useEffect(() => {
    const saved = localStorage.getItem("smarttask-language") as Language;
    if (saved && (saved === "en" || saved === "id")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("smarttask-language", lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    const newLang = language === "en" ? "id" : "en";
    setLanguage(newLang);
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string): string => {
      return translations[language][key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
