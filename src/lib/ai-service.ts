import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { Task } from "@/types/task";

// Create Google AI provider with API key from environment
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

// Debug log (remove in production)
console.log("AI Service - API Key present:", !!apiKey);
console.log("AI Service - Model:", import.meta.env.VITE_AI_MODEL || "gemini-1.5-flash");

if (!apiKey) {
  console.error("ERROR: VITE_GOOGLE_API_KEY is not set in environment variables!");
}

const google = createGoogleGenerativeAI({
  apiKey,
});

const model = import.meta.env.VITE_AI_MODEL || "gemini-1.5-flash";

// Define Zod schemas
const TaskSchema = z.object({
  title: z.string().describe("Clear task description (max 100 chars)"),
  est_min: z.number().min(15).max(240).describe("Time estimate in minutes (15-240)"),
  dep_id: z.number().nullable().describe("Index of dependent task or null"),
});

const TasksResponseSchema = z.object({
  tasks: z.array(TaskSchema).describe("Array of tasks to complete the goal"),
});

interface AIGeneratedTask {
  title: string;
  est_min: number;
  dep_id: null;
}

interface GenerateTasksInput {
  goalTitle: string;
  context?: string;
  existingTasks?: Task[]; // Existing tasks to avoid duplication
  language?: "en" | "id"; // Language for task generation
}

interface RefineTasksInput {
  tasks: Task[];
  prompt: string;
  language?: "en" | "id";
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract key action words from task title
function extractKeyActions(title: string): string[] {
  const actionWords = [
    'setup', 'install', 'configure', 'create', 'initialize', 'implement',
    'write', 'add', 'set', 'build', 'design', 'develop', 'test', 'run', 
    'deploy', 'push', 'commit', 'connect', 'integrate'
  ];
  
  const normalized = title.toLowerCase();
  return actionWords.filter(word => normalized.includes(word));
}

// Calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  if (s1 === s2) return 1;
  
  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;
  
  const words1 = new Set(s1.split(" ").filter(w => w.length > 2));
  const words2 = new Set(s2.split(" ").filter(w => w.length > 2));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  // Check for shared action words
  const actions1 = extractKeyActions(s1);
  const actions2 = extractKeyActions(s2);
  const commonActions = actions1.filter(a => actions2.includes(a));
  
  let similarity = intersection.size / union.size;
  
  // Boost similarity if they share action words
  if (commonActions.length > 0 && intersection.size >= 2) {
    similarity = Math.max(similarity, 0.6);
  }
  
  return similarity;
}

// Remove duplicate tasks based on title similarity
function removeDuplicates(tasks: AIGeneratedTask[], existingTasks?: Task[]): AIGeneratedTask[] {
  const uniqueTasks: AIGeneratedTask[] = [];
  const similarityThreshold = 0.5; // Lowered to 50% to catch more duplicates
  
  for (const task of tasks) {
    // Check against already accepted tasks
    let isDuplicate = false;
    
    for (const uniqueTask of uniqueTasks) {
      const similarity = calculateSimilarity(task.title, uniqueTask.title);
      if (similarity >= similarityThreshold) {
        isDuplicate = true;
        console.log(`Duplicate detected: "${task.title}" similar to "${uniqueTask.title}" (${(similarity * 100).toFixed(1)}%)`);
        break;
      }
    }
    
    // Check against existing tasks if provided
    if (!isDuplicate && existingTasks) {
      for (const existingTask of existingTasks) {
        const similarity = calculateSimilarity(task.title, existingTask.title);
        if (similarity >= similarityThreshold) {
          isDuplicate = true;
          console.log(`Duplicate with existing: "${task.title}" similar to "${existingTask.title}" (${(similarity * 100).toFixed(1)}%)`);
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      uniqueTasks.push(task);
    }
  }
  
  return uniqueTasks;
}

// Merge similar tasks with smart consolidation
function mergeSimilarTasks(tasks: AIGeneratedTask[]): AIGeneratedTask[] {
  const merged: AIGeneratedTask[] = [];
  const similarityThreshold = 0.45; // Lower threshold to catch more similarities
  
  for (const task of tasks) {
    let mergedWithExisting = false;
    
    for (const existing of merged) {
      const similarity = calculateSimilarity(task.title, existing.title);
      
      if (similarity >= similarityThreshold && similarity < 0.85) {
        // Check if they share action words
        const actions1 = extractKeyActions(task.title);
        const actions2 = extractKeyActions(existing.title);
        const commonActions = actions1.filter(a => actions2.includes(a));
        
        // Only merge if they share action words or high word overlap
        if (commonActions.length > 0 || similarity > 0.6) {
          console.log(`Merging similar tasks: "${task.title}" with "${existing.title}" (${(similarity * 100).toFixed(1)}%)`);
          
          // Combine unique words from both titles
          const words1 = new Set(task.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
          const words2 = new Set(existing.title.toLowerCase().split(/\s+/).filter(w => w.length > 2));
          const combinedWords = [...new Set([...words1, ...words2])]
            .filter(w => !['the', 'and', 'for', 'with', 'to', 'of', 'in', 'a'].includes(w))
            .slice(0, 5);
          
          if (combinedWords.length > 2) {
            existing.title = combinedWords.join(' ').replace(/^\w/, c => c.toUpperCase());
          } else if (task.title.length > existing.title.length) {
            existing.title = task.title;
          }
          
          existing.est_min = Math.round((existing.est_min + task.est_min) / 2);
          mergedWithExisting = true;
          break;
        }
      }
    }
    
    if (!mergedWithExisting) {
      merged.push({ ...task });
    }
  }
  
  return merged;
}

export async function generateTasksWithAI({
  goalTitle,
  context,
  existingTasks,
  language = "en",
}: GenerateTasksInput): Promise<AIGeneratedTask[]> {
  const isIndonesian = language === "id";
  
  const systemPromptEn = `You are a task decomposition expert. Create a clear, step-by-step plan to achieve the goal.

🚨 CRITICAL - TASK 1 AND TASK 2 MUST BE COMPLETELY DIFFERENT:
- They CANNOT use the same primary action verb
- They CANNOT target the same component/object
- They must address DIFFERENT aspects of the project

VERB ROTATION PATTERN (use different verb for each task):
1. Initialize/Setup → 2. Install/Configure → 3. Create/Build → 4. Implement/Develop → 5. Write/Test → 6. Deploy/Verify

✅ CORRECT (All different):
Task 1: "Initialize Git repository and clone locally"
Task 2: "Install Next.js framework with TypeScript"
Task 3: "Configure Tailwind CSS theme and components"
Task 4: "Create database schema in PostgreSQL"
Task 5: "Implement user authentication API"
Task 6: "Write integration tests for auth flow"

❌ WRONG (Task 1 & 2 too similar):
Task 1: "Setup project environment"
Task 2: "Configure development environment"

❌ WRONG (Same verb "Install"):
Task 1: "Install React dependencies"
Task 2: "Install testing libraries"

RULES:
1. Generate 4-6 HIGHLY DISTINCT tasks
2. Each task MUST use a DIFFERENT primary action verb
3. No two tasks can target the same component/feature
4. Tasks must form a LOGICAL progression
5. Time estimates: 15-240 minutes per task
6. ALL tasks must be in ENGLISH language

Output JSON with unique tasks array in ENGLISH:`;

  const systemPromptId = `Anda adalah ahli dekomposisi tugas. Buat rencana langkah demi langkah yang jelas untuk mencapai tujuan.

🚨 PENTING - TUGAS 1 DAN TUGAS 2 HARUS BERBEDA SEPENUHNYA:
- Tidak boleh menggunakan kata kerja aksi yang sama
- Tidak boleh menarget komponen/objek yang sama
- Harus menangani aspek BERBEDA dari proyek

POLA ROTASI KATA KERJA (gunakan kata kerja berbeda untuk setiap tugas):
1. Inisialisasi/Setup → 2. Instal/Konfigurasi → 3. Buat/Bangun → 4. Implementasi/Kembangkan → 5. Tulis/Uji → 6. Deploy/Verifikasi

✅ BENAR (Semua berbeda):
Tugas 1: "Inisialisasi repositori Git dan clone ke lokal"
Tugas 2: "Instal framework Next.js dengan TypeScript"
Tugas 3: "Konfigurasi tema dan komponen Tailwind CSS"
Tugas 4: "Buat skema database di PostgreSQL"
Tugas 5: "Implementasi endpoint API autentikasi pengguna"
Tugas 6: "Tulis tes integrasi untuk alur autentikasi"

❌ SALAH (Tugas 1 & 2 terlalu mirip):
Tugas 1: "Setup environment proyek"
Tugas 2: "Konfigurasi environment pengembangan"

❌ SALAH (Kata kerja sama "Instal"):
Tugas 1: "Instal dependensi React"
Tugas 2: "Instal library testing"

ATURAN:
1. Hasilkan 4-6 tugas YANG SANGAT BERBEDA
2. Setiap tugas HARUS menggunakan kata kerja aksi yang BERBEDA
3. Tidak ada dua tugas yang boleh menarget fitur/komponen yang sama
4. Tugas harus membentuk progresi LOGIS
5. Estimasi waktu: 15-240 menit per tugas
6. SEMUA tugas harus dalam bahasa INDONESIA

Output JSON dengan array tugas unik dalam bahasa INDONESIA:`;

  const systemPrompt = isIndonesian ? systemPromptId : systemPromptEn;

  const existingTasksContext = existingTasks && existingTasks.length > 0
    ? isIndonesian
      ? `\n\nTUGAS YANG ADA (JANGAN DUPLIKASI):\n${existingTasks.map(t => `- ${t.title}`).join("\n")}`
      : `\n\nEXISTING TASKS (DO NOT DUPLICATE THESE):\n${existingTasks.map(t => `- ${t.title}`).join("\n")}`
    : "";

  const languageInstruction = isIndonesian
    ? "\n\nPENTING: Hasilkan SEMUA tugas dalam bahasa INDONESIA."
    : "\n\nIMPORTANT: Generate ALL tasks in ENGLISH language.";

  const userPrompt = context
    ? isIndonesian
      ? `Tujuan: ${goalTitle}\n\nKonteks tambahan: ${context}${existingTasksContext}${languageInstruction}`
      : `Goal: ${goalTitle}\n\nAdditional context: ${context}${existingTasksContext}${languageInstruction}`
    : isIndonesian
      ? `Tujuan: ${goalTitle}${existingTasksContext}${languageInstruction}`
      : `Goal: ${goalTitle}${existingTasksContext}${languageInstruction}`;

  try {
    const { object } = await generateObject({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
      schema: TasksResponseSchema,
    });

    console.log("AI generated tasks:", object.tasks.length);

    // Process tasks: remove duplicates and merge similar ones
    let processedTasks = object.tasks.map((task) => ({
      title: task.title,
      est_min: Math.max(15, Math.min(240, task.est_min)),
      dep_id: null,
    }));

    // Remove duplicates
    processedTasks = removeDuplicates(processedTasks, existingTasks);
    console.log("After duplicate removal:", processedTasks.length);

    // Merge similar tasks
    processedTasks = mergeSimilarTasks(processedTasks);
    console.log("After merging similar:", processedTasks.length);

    // STRICT CHECK: Ensure task 1 and task 2 are never similar
    if (processedTasks.length >= 2) {
      const similarity = calculateSimilarity(processedTasks[0].title, processedTasks[1].title);
      if (similarity >= 0.4) {
        console.warn(`Task 1 and 2 too similar (${(similarity * 100).toFixed(1)}%). Regenerating second task...`);
        // Keep task 1, regenerate task 2 with different focus
        processedTasks.splice(1, 1);
      }
    }

    // Ensure we have at least some tasks
    if (processedTasks.length === 0 && object.tasks.length > 0) {
      console.warn("All tasks were filtered as duplicates, keeping first 3");
      processedTasks = object.tasks.slice(0, 3).map(task => ({
        title: task.title,
        est_min: Math.max(15, Math.min(240, task.est_min)),
        dep_id: null,
      }));
    }

    return processedTasks;
  } catch (error) {
    console.error("AI Task Generation Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to generate tasks with AI"
    );
  }
}

export async function refineTasksWithAI({
  tasks,
  prompt,
  language = "en",
}: RefineTasksInput): Promise<AIGeneratedTask[]> {
  const isIndonesian = language === "id";

  const systemPromptEn = `You are a task refinement expert. Modify the given tasks based on user feedback.

CRITICAL RULES - AVOID DUPLICATES:
1. Keep tasks UNIQUE and NON-REDUNDANT
2. When adding new tasks, ensure they don't duplicate existing ones
3. Consolidate overlapping tasks when possible
4. Each task should serve a distinct purpose
5. Time estimates: 15-240 minutes
6. Maintain the SAME language (ENGLISH) for all tasks`;

  const systemPromptId = `Anda adalah ahli penyempurnaan tugas. Modifikasi tugas yang ada berdasarkan masukan pengguna.

ATURAN PENTING - HINDARI DUPLIKASI:
1. Pertahankan tugas UNIK dan TANPA REDUNDANSI
2. Saat menambah tugas baru, pastikan tidak menduplikasi tugas yang ada
3. Gabungkan tugas yang tumpang tindih jika memungkinkan
4. Setiap tugas harus memiliki tujuan yang berbeda
5. Estimasi waktu: 15-240 menit
6. Pertahankan bahasa yang SAMA (INDONESIA) untuk semua tugas`;

  const systemPrompt = isIndonesian ? systemPromptId : systemPromptEn;

  const tasksJson = tasks
    .map(
      (t, i) =>
        `${i}. ${t.title} (${t.est_min}min)${
          t.depends_on ? ` [depends on task index]` : ""
        }`
    )
    .join("\n");

  const userPrompt = isIndonesian
    ? `Tugas saat ini:\n${tasksJson}\n\nPermintaan pengguna: ${prompt}\n\nPENTING: Pertahankan bahasa INDONESIA untuk semua tugas.`
    : `Current tasks:\n${tasksJson}\n\nUser request: ${prompt}\n\nIMPORTANT: Maintain ENGLISH language for all tasks.`;

  try {
    const { object } = await generateObject({
      model: google(model),
      system: systemPrompt,
      prompt: userPrompt,
      schema: TasksResponseSchema,
    });

    let processedTasks = object.tasks.map((task) => ({
      title: task.title,
      est_min: Math.max(15, Math.min(240, task.est_min)),
      dep_id: null,
    }));

    // Remove duplicates and merge similar
    processedTasks = removeDuplicates(processedTasks);
    processedTasks = mergeSimilarTasks(processedTasks);

    return processedTasks;
  } catch (error) {
    console.error("AI Task Refinement Error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to refine tasks with AI"
    );
  }
}
