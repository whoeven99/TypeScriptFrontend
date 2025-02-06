import axios, { AxiosError } from "axios";

// 添加自定义错误类
export class AppError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface RetryConfig {
  maxRetries?: number;
  retryDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxRetries = 5, // 修改为5次重试
    retryDelay = 1000,
    shouldRetry = (error: any) => {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        return (
          !status || // 网络错误
          status === 429 || // 速率限制
          status >= 500 || // 服务器错误
          error.code === 'ECONNABORTED' // 超时
        );
      }
      return false;
    }
  } = config;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries || !shouldRetry(error)) {
        console.error(`All ${maxRetries} retry attempts failed:`, error);
        // 转换错误为 AppError
        if (axios.isAxiosError(error)) {
          throw new AppError(
            error.response?.data?.message || 'Network error',
            error.response?.status || 500,
            error.code
          );
        }
        throw error;
      }

      // 指数退避延迟
      const delay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
} 