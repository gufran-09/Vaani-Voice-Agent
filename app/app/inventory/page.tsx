'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Package, Plus, Search, Building2 } from 'lucide-react';

const AVAILABILITY_BADGE: Record<string, 'default' | 'secondary' | 'destructive'> = {
  available: 'default',
  limited: 'secondary',
  unavailable: 'destructive',
};

export default function InventoryPage() {
  const { currentProperty } = useApp();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchItems = useCallback(async () => {
    if (!currentProperty) return;
    setLoading(true);

    const { data } = await supabase
      .from('menu_items')
      .select(`
        id, name, price, availability, prep_time_minutes, spoken_aliases, allergens,
        menu_categories(name)
      `)
      .eq('property_id', currentProperty.id)
      .order('name', { ascending: true });

    setItems(data ?? []);
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateAvailability = async (itemId: string, availability: string) => {
    await supabase
      .from('menu_items')
      .update({ availability, updated_at: new Date().toISOString() })
      .eq('id', itemId);

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, availability } : item))
    );
  };

  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <Building2 className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">Select a property to manage inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage item availability across your menu
            </p>
          </div>
        </div>
        <Link href="/app/menus">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Add item
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold">{items.filter((i) => i.availability === 'available').length}</div>
            <div className="text-xs text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold text-warning">{items.filter((i) => i.availability === 'limited').length}</div>
            <div className="text-xs text-muted-foreground">Limited</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold text-destructive">{items.filter((i) => i.availability === 'unavailable').length}</div>
            <div className="text-xs text-muted-foreground">Unavailable</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground animate-pulse-soft">Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              {search ? 'No items match your search.' : 'No menu items yet.'}
            </p>
            <Link href="/app/menus">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Add your first item
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="hidden sm:table-cell">Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="hidden md:table-cell">Prep Time</TableHead>
                  <TableHead className="hidden lg:table-cell">Aliases</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {item.menu_categories?.name ?? 'Uncategorized'}
                    </TableCell>
                    <TableCell>₹{item.price}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.prep_time_minutes}m
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                      {item.spoken_aliases?.length > 0 ? item.spoken_aliases.join(', ') : '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={item.availability}
                        onValueChange={(val) => updateAvailability(item.id, val)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="limited">Limited</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
