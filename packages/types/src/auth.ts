export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface RegisterRequestBody {
  email: string;
  username: string;
  password: string;
  passwordConfirmation: string;
}
