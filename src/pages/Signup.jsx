import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout, { Field, FormError, PrimaryButton } from "../components/AuthLayout.jsx";
import { signup } from "../auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setError("");
    const next = {};
    if (!name.trim()) next.name = "이름을 입력하세요.";
    if (!EMAIL_RE.test(email.trim())) next.email = "올바른 이메일 형식이 아닙니다.";
    if (password.length < 8) next.password = "비밀번호는 8자 이상이어야 합니다.";
    if (confirm !== password) next.confirm = "비밀번호가 일치하지 않습니다.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    try {
      signup({ name, email, password });
      navigate("/", { replace: true });
    } catch (ex) {
      setError(ex.message);
    }
  };

  return (
    <AuthLayout
      title="회원가입"
      subtitle="계정을 만들고 나만의 매매 전략을 코드화해 보세요."
      footer={
        <>
          이미 계정이 있으신가요?{" "}
          <Link to="/login" style={{ color: "#4f8cff", fontWeight: 600, textDecoration: "none" }}>
            로그인
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <Field
          label="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          autoComplete="name"
          error={errors.name}
        />
        <Field
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email}
        />
        <Field
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="8자 이상"
          autoComplete="new-password"
          error={errors.password}
        />
        <Field
          label="비밀번호 확인"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="비밀번호 재입력"
          autoComplete="new-password"
          error={errors.confirm}
        />
        <FormError>{error}</FormError>
        <PrimaryButton type="submit">회원가입 →</PrimaryButton>
      </form>
    </AuthLayout>
  );
}
