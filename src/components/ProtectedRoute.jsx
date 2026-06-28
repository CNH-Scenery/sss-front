import React from "react";
import { Navigate } from "react-router-dom";
import { isAuthed } from "../auth.js";

export default function ProtectedRoute({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}
