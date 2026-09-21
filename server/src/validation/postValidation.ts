export function normaliseTags(raw: unknown): string[] {
    // Accepts comma‑separated tags; returns cleaned list
    if (typeof raw !== "string") return [];

    return raw
      .split(",")                   
      .map((tag) => tag.trim().toLowerCase()) 
      .filter((tag) => tag.length > 0)        
      .slice(0, 3);                 
}

export function validatePost(body: any): string | null {
  const { type, plan, title, problem, abstract, articleText } = body;

  // Check post type
  if (type !== "question" && type !== "article") {
    return "Post type must be either a question or an article.";
  }

  // Check plan
  if (plan !== "free" && plan !== "paid") {
    return "Post plan must be either free or paid.";
  }

  // Title required
  if (typeof title !== "string" || !title.trim()) {
    return "Please enter a title.";
  }

  // Type‑specific validation
  if (type === "question") {
    if (typeof problem !== "string" || !problem.trim()) {
      return "Please describe your problem.";
    }
  } else {
    if (typeof abstract !== "string" || !abstract.trim()) {
      return "Please enter an abstract.";
    }
    if (typeof articleText !== "string" || !articleText.trim()) {
      return "Please enter the article text.";
    }
  }

  // Must have at least one valid tag
  if (normaliseTags(body.tags).length === 0) {
    return "Please add at least one tag.";
  }

  return null; // valid post
}
