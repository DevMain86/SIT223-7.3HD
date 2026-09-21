// Data and shared type for the article/tutorial cards shown in the Featured sections.
import article1 from "../assets/images/learningreact.jpg";
import article2 from "../assets/images/buildapi.png";
import article3 from "../assets/images/reacthooks.jpg";
import tutorial1 from "../assets/images/JS.png";
import tutorial2 from "../assets/images/routing.jpg";
import tutorial3 from "../assets/images/server.jpg";

// The shape of one card. Reused as props by PostCard.
export interface Post {
    id: number;
    image: string;
    title: string;
    description: string;
    rating: number;
    author: string;
}

// Featured Articles
export const articles: Post[] = [
  { id: 1, image: article1, title: "Getting Started with React", description: "Introducting React the best way to...", rating: 5, author: "Judy Jones" },
  { id: 2, image: article2, title: "Building APIs with Node", description: "Node and APIs are...", rating: 5, author: "Sam Lee" },
  { id: 3, image: article3, title: "Understanding React Hooks", description: "React hooks help your project by...", rating: 5, author: "Alex Adams" },
];

// Featured Tutorials
export const tutorials: Post[] = [
  { id: 1, image: tutorial1, title: "Modern JavaScript Essentials", description: "JS 101...", rating: 5, author: "devguru" },
  { id: 2, image: tutorial2, title: "Routing with React Router", description: "A react router can...", rating: 5, author: "routemaster" },
  { id: 3, image: tutorial3, title: "Express Server Basics", description: "Starting a basic server...", rating: 4.9, author: "backendbob" },
];