import { UserButton } from "@clerk/nextjs";

type Props = {
  title: string;
  right?: React.ReactNode;
};

export default function Header({ title, right }: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur border-b border-border">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {right}
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </div>
    </header>
  );
}
