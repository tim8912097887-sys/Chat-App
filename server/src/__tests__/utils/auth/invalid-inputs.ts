import { signupUserInput } from './factory.js';

const validInput = signupUserInput();

export const invalidSignupInputs: {
  description: string;
  input: object;
  expectedDetail: string;
}[] = [
  {
    description: 'when signup body is not an object should return 400 with validation error',
    input: [],
    expectedDetail: 'body:',
  },
  {
    description: 'when name is missing should return 400 with validation error',
    input: { email: validInput.email, password: validInput.password },
    expectedDetail: 'name:',
  },
  {
    description: 'when name is not a string should return 400 with validation error',
    input: { ...validInput, name: null },
    expectedDetail: 'name should be a string',
  },
  {
    description: 'when name is blank should return 400 with validation error',
    input: { ...validInput, name: '   ' },
    expectedDetail: 'name must be at least 2 characters',
  },
  {
    description: 'when name is shorter than 2 characters should return 400 with validation error',
    input: { ...validInput, name: 'A' },
    expectedDetail: 'name must be at least 2 characters',
  },
  {
    description: 'when name exceeds 100 characters should return 400 with validation error',
    input: { ...validInput, name: 'a'.repeat(101) },
    expectedDetail: 'name must be less than 100 characters',
  },
  {
    description: 'when email is missing should return 400 with validation error',
    input: { name: validInput.name, password: validInput.password },
    expectedDetail: 'email:',
  },
  {
    description: 'when email is not a string should return 400 with validation error',
    input: { ...validInput, email: null },
    expectedDetail: 'email should be a string',
  },
  {
    description: 'when email is blank should return 400 with validation error',
    input: { ...validInput, email: '   ' },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when email is invalid should return 400 with validation error',
    input: { ...validInput, email: 'not-an-email' },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when email exceeds 254 characters should return 400 with validation error',
    input: {
      ...validInput,
      email: `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(61)}`,
    },
    expectedDetail: 'email is too long',
  },
  {
    description: 'when password is missing should return 400 with validation error',
    input: { name: validInput.name, email: validInput.email },
    expectedDetail: 'password:',
  },
  {
    description: 'when password is not a string should return 400 with validation error',
    input: { ...validInput, password: null },
    expectedDetail: 'password should be a string',
  },
  {
    description:
      'when password is shorter than 8 characters should return 400 with validation error',
    input: { ...validInput, password: '1234567' },
    expectedDetail: 'password must be at least 8 characters',
  },
  {
    description: 'when password exceeds 72 characters should return 400 with validation error',
    input: { ...validInput, password: 'a'.repeat(73) },
    expectedDetail: 'password must be less than 72 characters',
  },
];

export const invalidLoginInputs: {
  description: string;
  input: object;
  expectedDetail: string;
}[] = [
  {
    description: 'when login body is not an object should return 400 with validation error',
    input: [],
    expectedDetail: 'body:',
  },
  {
    description: 'when email is missing should return 400 with validation error',
    input: { password: validInput.password },
    expectedDetail: 'email:',
  },
  {
    description: 'when email is not a string should return 400 with validation error',
    input: { email: null, password: validInput.password },
    expectedDetail: 'email should be a string',
  },
  {
    description: 'when email is blank should return 400 with validation error',
    input: { email: '   ', password: validInput.password },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when email is invalid should return 400 with validation error',
    input: { email: 'not-an-email', password: validInput.password },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when email exceeds 254 characters should return 400 with validation error',
    input: {
      email: `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(61)}`,
      password: validInput.password,
    },
    expectedDetail: 'email is too long',
  },
  {
    description: 'when password is missing should return 400 with validation error',
    input: { email: validInput.email },
    expectedDetail: 'password:',
  },
  {
    description: 'when password is not a string should return 400 with validation error',
    input: { email: validInput.email, password: null },
    expectedDetail: 'password should be a string',
  },
  {
    description:
      'when password is shorter than 8 characters should return 400 with validation error',
    input: { email: validInput.email, password: '1234567' },
    expectedDetail: 'password must be at least 8 characters',
  },
  {
    description: 'when password exceeds 72 characters should return 400 with validation error',
    input: { email: validInput.email, password: 'a'.repeat(73) },
    expectedDetail: 'password must be less than 72 characters',
  },
];
