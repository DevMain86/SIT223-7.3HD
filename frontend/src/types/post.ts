// Firestore timestamp shape returned by backend
export interface FirestoreTimestamp {
  _seconds: number;      
  _nanoseconds: number;  
}

// Fields shared by all posts
interface PostBase {
  id: string;           
  plan: "free" | "paid"; 
  title: string;         
  tags: string[];        
  authorId: string;      
  authorName: string;    
  createdAt: FirestoreTimestamp; 
}

// Question variant
export interface QuestionPost extends PostBase {
  type: "question";     
  problem: string;       
}

// Article variant
export interface ArticlePost extends PostBase {
  type: "article";      
  abstract: string;     
  articleText: string;   
}

// Union of all post types
export type Post = QuestionPost | ArticlePost;
