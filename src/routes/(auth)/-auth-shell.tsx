import { useState, type ReactNode } from 'react';
import type { AnyFieldApi } from '@tanstack/react-form';
import { Eye, EyeOff } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { fieldError } from '@/components/form-field';
import { PixelRevealLink } from '@/components/pixel-reveal-link';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

// 认证页共用画框：左栏大标题 + 切换卡，右栏白色表单卡，外框四角定位标记。
// 布局参考竞品 ragnarok 登录页，视觉令牌沿用 DESIGN_SYSTEM.md 的画框体系。
export function AuthShell({
  brand,
  title,
  description,
  switchPrompt,
  switchLabel,
  switchHref,
  belowCard,
  children,
}: {
  brand?: string;
  title: string;
  description: string;
  switchPrompt: string;
  switchLabel: string;
  switchHref: string;
  belowCard?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="curvg-page-shell relative flex min-h-svh flex-col items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
      {/* 坐标网格装饰层：不接收指针事件 */}
      <div
        aria-hidden="true"
        className="curvg-coordinate-grid pointer-events-none absolute inset-0"
      />

      <div className="relative z-10 flex w-full max-w-[1040px] flex-col gap-8 sm:gap-10">
        <Link
          href="/"
          className="group flex items-center justify-center gap-2 self-center"
        >
          <img
            src={envConfigs.app_logo}
            alt=""
            className="size-8 rounded-lg transition-transform duration-300 group-hover:scale-105"
          />
          <span className="curvg-heading text-lg">
            {brand || envConfigs.app_name}
          </span>
        </Link>

        <div className="relative grid rounded-xl border lg:grid-cols-2 lg:grid-rows-[1fr_auto]">
          <span
            aria-hidden="true"
            className="curvg-corner -top-[7px] -left-[7px]"
          />
          <span
            aria-hidden="true"
            className="curvg-corner -top-[7px] -right-[7px]"
          />
          <span
            aria-hidden="true"
            className="curvg-corner -bottom-[7px] -left-[7px]"
          />
          <span
            aria-hidden="true"
            className="curvg-corner -right-[7px] -bottom-[7px]"
          />

          {/* 左栏：标题与说明 */}
          <div className="p-7 sm:p-10 lg:p-12">
            <h1 className="curvg-heading text-4xl sm:text-5xl">{title}</h1>
            <p className="text-muted-foreground mt-3 sm:mt-4 sm:text-lg">
              {description}
            </p>
          </div>

          {/* 右栏：表单卡（桌面端跨两行，带 1px 分栏线） */}
          <div className="p-4 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:border-l lg:p-8">
            <div className="bg-card h-full rounded-lg border p-6 shadow-sm sm:p-8">
              {children}
            </div>
          </div>

          {/* 左栏底部：登录 / 注册切换卡 */}
          <div className="p-7 pt-2 sm:p-10 sm:pt-2 lg:p-12 lg:pt-0">
            <div className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4 shadow-sm sm:p-5">
              <p className="text-[15px]">{switchPrompt}</p>
              <PixelRevealLink
                href={switchHref}
                label={switchLabel}
                variant="navigation"
              />
            </div>
          </div>
        </div>

        {belowCard && <div className="text-center">{belowCard}</div>}
      </div>
    </div>
  );
}

// 认证页密码输入：h-12 高输入框 + 显隐切换，错误展示与 TextField 一致。
export function AuthPasswordField({
  field,
  label,
  placeholder,
  autoComplete,
  required,
}: {
  field: AnyFieldApi;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const error = fieldError(field);

  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={field.name}
          name={field.name}
          type={visible ? 'text' : 'password'}
          value={(field.state.value as string) ?? ''}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="h-12 rounded-md px-4 pr-11 text-[15px]"
          aria-invalid={error ? true : undefined}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? m['common.sign.hide_password']()
              : m['common.sign.show_password']()
          }
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3.5 -translate-y-1/2 transition-colors"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="size-[18px]" />
          ) : (
            <Eye aria-hidden="true" className="size-[18px]" />
          )}
        </button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </Field>
  );
}
