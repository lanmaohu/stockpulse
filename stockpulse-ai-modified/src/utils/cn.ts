import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名，自动处理冲突
 * 例如：cn('px-2', 'px-4') 会返回 'px-4'（后面的覆盖前面的）
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
