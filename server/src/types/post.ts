import type {Timestamp} from "firebase-admin/firestore";

// Shared post fields
interface PostBase {
    plan: "free" | "paid";    
    title: string;         
    tags: string[];          
    authorId: string;         
    authorName: string;      
    createdAt: Timestamp;     
}

// Question post structure
export interface Question extends PostBase {
    type: "question";        
    problem: string;     
}

// Article post structure
export interface Article extends PostBase {
    type: "article";   
    abstract: string;   
    articleText: string;     
}

// Union type for all post variants
export type Post = Question | Article;
