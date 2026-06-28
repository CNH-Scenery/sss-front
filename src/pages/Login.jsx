import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout, { Field, FormError, PrimaryButton } from "../components/AuthLayout.jsx";
import { login } from "../auth.js";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }
    try {
      login(email, password);
      navigate("/", { replace: true });
    } catch (ex) {
      setError(ex.message);
    }
  };

  return (
    <AuthLayout
      title="로그인"
      subtitle="암묵지 매매 전략 워크스페이스에 접속하세요."
      footer={
        <>
          계정이 없으신가요?{" "}
          <Link to="/signup" style={{ color: "#4f8cff", fontWeight: 600, textDecoration: "none" }}>
            회원가입
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
        <Field
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <FormError>{error}</FormError>
        <PrimaryButton type="submit">로그인 →</PrimaryButton>
      </form>
    </AuthLayout>
  );
}
