// Data and shared type for the portfolio projects shown in the work section.
import hotdogImg from "../assets/images/cover_hotdog2.jpg";
import envMonitorImg from "../assets/images/EnvMonitor.jpg";

// The shape of one project, reused as props by ProjectCard
export interface Project {
  id: number;
  image: string;
  name: string;
  description: string;
  link: string;
}

export const projects: Project[] = [
  {
    id: 1,
    image: hotdogImg,
    name: "Project Hot Dog",
    description:
      "Automated pet comfort system on an Arduino Uno R4 and Raspberry Pi 4 - three-mode state machine, MQTT telemetry, and a Node-RED dashboard with email alerts.",
    link: "https://github.com/DevMain86/SIT210-StuartMain/tree/main/ProjectHotDog",
  },
  {
    id: 2,
    image: envMonitorImg,
    name: "Office Environment Monitor",
    description:
      "Desk-based air-quality station on an Arduino Uno R4 WiFi - temperature, humidity and air-quality sensors feeding a local LCD display and Arduino Cloud.",
    link: "https://github.com/DevMain86/SIT210-StuartMain/tree/main/office-environment-monitor",
  },
];