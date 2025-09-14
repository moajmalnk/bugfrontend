import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const MessagingButton = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  return (
    <Link to={role ? `/${role}/messages` : "/messages"}>
      <Button
        variant="ghost"
        className="w-full justify-start mb-1"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="ml-2">Messages</span>
      </Button>
    </Link>
  );
};
