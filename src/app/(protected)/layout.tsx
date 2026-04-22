import { Page } from '@/components/PageLayout';

export default async function TabsLayout({children,}: {children: React.ReactNode;}) {

  return (
    <Page>
      {children}
    </Page>
  );
  
}
