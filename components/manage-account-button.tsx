import { Button } from './ui/button';

type ButtonStyle = 'primary' | 'main' | 'secondary';

interface ManageAccountButtonProps {
  className?: string;
  style?: ButtonStyle;
}

const getButtonStyleClasses = (style: ButtonStyle) => {
  switch (style) {
    case 'primary':
      return {
        variant: 'blue' as const,
        className: ''
      };
    case 'main':
      return {
        variant: 'outline' as const,
        className: 'bg-black text-white border-black hover:bg-gray-800 hover:text-white dark:bg-white dark:text-black dark:border-white dark:hover:bg-gray-100'
      };
    case 'secondary':
      return {
        variant: 'outline' as const,
        className: 'dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
      };
    default:
      return {
        variant: 'outline' as const,
        className: ''
      };
  }
};

export function ManageAccountButton({ className = "", style = 'secondary' }: ManageAccountButtonProps) {
  const buttonStyle = getButtonStyleClasses(style);
  
  return (
    <Button
      variant={buttonStyle.variant}
      size="sm"
      asChild
      className={`h-10 px-3 ${buttonStyle.className} ${className}`}
    >
      <a 
        href="https://account.myapps.ai/" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2"
      >
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span className="hidden sm:inline">Manage Account</span>
      </a>
    </Button>
  );
}
