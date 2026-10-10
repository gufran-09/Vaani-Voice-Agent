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
import { Package, Plus, Search, Building2, Utensils } from 'lucide-react';
import { ALL_FOOD_ITEMS, MENU_CATEGORIES } from '@/lib/menu-data';

const DEFAULT_INVENTORY_ITEMS = ALL_FOOD_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  price: item.price,
  availability: item.availability,
  prep_time_minutes: item.prep_time_minutes,
  spoken_aliases: item.spoken_aliases,
  allergens: item.allergens,
  category_id: item.category_id,
  menu_categories: { name: item.category_name },
}));

export default function InventoryPage() {
  const { currentProperty } = useApp();
  const [items, setItems] = useState<any[]>(DEFAULT_INVENTORY_ITEMS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const fetchItems = useCallback(async () => {
    if (!currentProperty) {
      setItems(DEFAULT_INVENTORY_ITEMS);
      return;
    }
    setLoading(true);

    try {
      const { data } = await supabase
        .from('menu_items')
        .select(`
          id, name, price, availability, prep_time_minutes, spoken_aliases, allergens, category_id,
          menu_categories(name)
        `)
        .eq('property_id', currentProperty.id)
        .order('name', { ascending: true });

      if (data && data.length > 0) {
        setItems(data);
      } else {
        setItems(DEFAULT_INVENTORY_ITEMS);
      }
    } catch {
      setItems(DEFAULT_INVENTORY_ITEMS);
    } finally {
      setLoading(false);
    }
  }, [currentProperty]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateAvailability = async (itemId: string, availability: string) => {
    if (currentProperty && !itemId.startsWith('item-')) {
      await supabase
        .from('menu_items')
        .update({ availability, updated_at: new Date().toISOString() })
        .eq('id', itemId);
    }

    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, availability } : item))
    );
  };

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.menu_categories?.name || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' ||
      item.category_id === selectedCategory ||
      item.menu_categories?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live stock management across all 28 database food items
            </p>
          </div>
        </div>
        <Link href="/app/menus">
          <Button size="sm">
            <Utensils className="w-4 h-4 mr-1.5" />
            Full Menu Catalog
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items, beverages, snacks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="text-xs h-8"
          >
            All ({items.length})
          </Button>
          {MENU_CATEGORIES.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.name || selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.name)}
              className="text-xs h-8 whitespace-nowrap"
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold">{items.filter((i) => i.availability === 'available').length}</div>
            <div className="text-xs text-muted-foreground">Available (In Stock)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold text-amber-500">{items.filter((i) => i.availability === 'limited').length}</div>
            <div className="text-xs text-muted-foreground">Limited Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-display font-bold text-destructive">{items.filter((i) => i.availability === 'unavailable').length}</div>
            <div className="text-xs text-muted-foreground">Out of Stock</div>
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
              {search ? 'No items match your search.' : 'No items found.'}
            </p>
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
                  <TableHead className="hidden lg:table-cell">Voice Aliases</TableHead>
                  <TableHead>Stock Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div>
                        <span>{item.name}</span>
                        {item.allergens?.length > 0 && (
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            Contains: {item.allergens.join(', ')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      <Badge variant="outline" className="text-[11px]">
                        {item.menu_categories?.name ?? 'General'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">₹{item.price}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {item.prep_time_minutes}m
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-xs max-w-xs truncate">
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
                          <SelectItem value="unavailable">Out of Stock</SelectItem>
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
