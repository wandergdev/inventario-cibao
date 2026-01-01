declare module "express" {
  import { EventEmitter } from "events";

  export interface Request {
    body?: any;
    headers?: Record<string, string | undefined>;
    params?: Record<string, string>;
    query?: Record<string, string | undefined>;
    url?: string;
  }

  export interface Response {
    status(code: number): Response;
    json(body: any): Response;
    send(body?: any): Response;
    redirect(url: string): Response;
  }

  export type NextFunction = (err?: unknown) => void;

  export interface RouterHandler extends EventEmitter {
    post(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): this;
    get(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): this;
    patch(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): this;
    delete(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): this;
    use(...args: any[]): this;
  }

  export interface Express extends EventEmitter {
    use(...args: any[]): Express;
    get(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): Express;
    post(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): Express;
    patch(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): Express;
    delete(path: string, ...handlers: Array<(req: Request, res: Response, next: NextFunction) => unknown>): Express;
    listen(port: number, cb?: () => void): void;
  }

  interface ExpressStatic {
    (): Express;
    Router(): RouterHandler;
    json(): (req: Request, res: Response, next: NextFunction) => void;
  }

  const e: ExpressStatic;
  export = e;
}
