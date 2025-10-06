declare module 'lucide-react' {
  import * as React from 'react';
  export interface LucideProps extends React.SVGProps<SVGSVGElement> {
    color?: string;
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }
  export const Shield: React.FC<LucideProps>;
  export const AlertTriangle: React.FC<LucideProps>;
  export const Eye: React.FC<LucideProps>;
  export const Lock: React.FC<LucideProps>;
  export const FileText: React.FC<LucideProps>;
  export const Code: React.FC<LucideProps>;
  export const Zap: React.FC<LucideProps>;
  export const Bug: React.FC<LucideProps>;
  // fallback export
  const icons: Record<string, React.FC<LucideProps>>;
  export default icons;
}
