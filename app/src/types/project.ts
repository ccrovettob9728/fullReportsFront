export type Project = {
  id: number;
  name: string;
  description: string;
  status: "active" | "paused" | "completed";
};
