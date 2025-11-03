import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocumentHistoryTable } from '@/components/admin/DocumentHistoryTable';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export default function AdminDocuments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userId = searchParams.get('user');
  const userName = searchParams.get('name');

  const [filterUserId, setFilterUserId] = useState<string | null>(userId);
  const [filterUserName, setFilterUserName] = useState<string>(userName || '');

  useEffect(() => {
    if (userId) {
      setFilterUserId(userId);
      setFilterUserName(userName || '');
    }
  }, [userId, userName]);

  const handleClearFilter = () => {
    setFilterUserId(null);
    setFilterUserName('');
    setSearchParams({});
  };

  return (
    <div className="space-y-6">
      <DocumentHistoryTable 
        filterByUserId={filterUserId}
        filterByUserName={filterUserName}
        onClearFilter={handleClearFilter}
      />
    </div>
  );
}
