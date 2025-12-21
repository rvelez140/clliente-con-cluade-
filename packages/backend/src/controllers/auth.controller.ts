import { Request, Response } from 'express';
import authService from '../services/auth.service';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
      }

      const result = await authService.register(email, password, name);

      res.status(201).json({
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        token: result.token,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
      }

      const result = await authService.login(email, password);

      res.json({
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        token: result.token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  async me(req: any, res: Response) {
    try {
      const user = await authService.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export default new AuthController();
