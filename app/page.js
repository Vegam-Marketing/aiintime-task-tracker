"use client";

import TaskTracker from "../components/TaskTracker";
import LoginGate from "../components/LoginGate";

export default function Home() {
  return <LoginGate><TaskTracker /></LoginGate>;
}
