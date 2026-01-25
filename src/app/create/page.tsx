import { Metadata } from 'next';
import { CreateMarketView } from './CreateMarketView';
import { APP_NAME } from '~/lib/constants';

export const metadata: Metadata = {
  title: `Create Market | ${APP_NAME}`,
  description: 'Create a new belief market for your claim',
};

export default function CreateMarketPage() {
  return <CreateMarketView />;
}
