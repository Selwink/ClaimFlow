import Form from 'next/form';

import { Input } from './ui/input';
import { Label } from './ui/label';

export function AuthForm({
  action,
  children,
  defaultEmail = '',
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
}) {
  return (
    <Form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-muted-foreground font-medium"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-background h-11 text-md md:text-sm focus-visible:ring-primary"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          defaultValue={defaultEmail}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          htmlFor="password"
          className="text-muted-foreground font-medium"
        >
          Password
        </Label>

        <Input
          id="password"
          name="password"
          className="bg-background h-11 text-md md:text-sm focus-visible:ring-primary"
          type="password"
          required
        />
      </div>

      {children}
    </Form>
  );
}
