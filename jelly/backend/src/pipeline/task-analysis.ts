import { getOpenAI } from "../llm/index.js";

interface TaskAnalysisResult {
  goal: string;
  subTasks: string[];
  suggestedEntities: string[];
  taskName: string;
}

export async function analyzeTask(
  prompt: string,
): Promise<TaskAnalysisResult> {
  const llm = getOpenAI();

  return llm.generateJson<TaskAnalysisResult>({
    messages: [
      {
        role: "system",
        content: `You are a task analyst. Given a user's natural language prompt describing an information task, analyze it and extract:

1. "goal": A clear, concise description of the user's primary goal.
2. "subTasks": An array of 3-6 sub-tasks the user likely needs to accomplish.
3. "suggestedEntities": An array of entity names (UPPER_SNAKE_CASE) that would be needed to model this task.
4. "taskName": A short UPPER_SNAKE_CASE name for the root task entity.

Return only valid JSON matching this structure.`,
      },
      {
        role: "user",
        content: `User prompt: "I am hosting a dinner party"`,
      },
      {
        role: "assistant",
        content: JSON.stringify({
          goal: "Plan and organize a dinner party",
          subTasks: [
            "Decide date and location",
            "Create guest list and send invitations",
            "Plan the menu considering dietary restrictions",
            "Plan activities and entertainment",
            "Create shopping list for ingredients",
          ],
          suggestedEntities: [
            "DINNER_PLAN",
            "GUEST",
            "DISH",
            "ACTIVITY",
            "INGREDIENT",
          ],
          taskName: "DINNER_PLAN",
        }),
      },
      {
        role: "user",
        content: `User prompt: "${prompt}"`,
      },
    ],
    temperature: 0.7,
  });
}
