'use client';

import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/components/app-provider';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  ScrollText,
  Info,
  Clock,
  MapPin,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type KnowledgeDocument = Database['public']['Tables']['knowledge_documents']['Row'];

type Category = 'faq' | 'policy' | 'info' | 'hours' | 'location';

const CATEGORIES: Category[] = ['faq', 'policy', 'info', 'hours', 'location'];

const CATEGORY_META: Record<
  Category,
  { label: string; icon: typeof HelpCircle; badge: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  faq: { label: 'FAQs', icon: HelpCircle, badge: 'default' },
  policy: { label: 'Policies', icon: ScrollText, badge: 'secondary' },
  info: { label: 'General Info', icon: Info, badge: 'outline' },
  hours: { label: 'Operating Hours', icon: Clock, badge: 'secondary' },
  location: { label: 'Location', icon: MapPin, badge: 'outline' },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface DocForm {
  title: string;
  content: string;
  category: Category;
}

const EMPTY_FORM: DocForm = { title: '', content: '', category: 'faq' };

export default function KnowledgeBasePage() {
  const { currentProperty } = useApp();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DocForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!currentProperty) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('knowledge_documents')
      .select('*')
      .eq('property_id', currentProperty.id)
      .order('updated_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setDocuments(data ?? []);
    }
    setLoading(false);
  }, [currentProperty]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (doc: KnowledgeDocument) => {
    setEditingId(doc.id);
    setForm({ title: doc.title, content: doc.content, category: doc.category as Category });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentProperty) return;
    if (!form.title.trim() || !form.content.trim()) return;

    setSaving(true);
    if (editingId) {
      const { error: updateError } = await supabase
        .from('knowledge_documents')
        .update({
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
        })
        .eq('id', editingId);
      if (updateError) {
        setError(updateError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from('knowledge_documents')
        .insert({
          property_id: currentProperty.id,
          title: form.title.trim(),
          content: form.content.trim(),
          category: form.category,
        });
      if (insertError) {
        setError(insertError.message);
      }
    }
    setSaving(false);
    setDialogOpen(false);
    await fetchDocuments();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error: deleteError } = await supabase
      .from('knowledge_documents')
      .delete()
      .eq('id', deleteId);
    setDeleting(false);
    if (deleteError) {
      setError(deleteError.message);
    } else {
      setDeleteId(null);
      await fetchDocuments();
    }
  };

  // Group documents by category
  const grouped: Record<Category, KnowledgeDocument[]> = {
    faq: [],
    policy: [],
    info: [],
    hours: [],
    location: [],
  };
  for (const doc of documents) {
    const cat = doc.category as Category;
    if (grouped[cat]) {
      grouped[cat].push(doc);
    } else {
      grouped.info.push(doc);
    }
  }

  if (!currentProperty) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-7 h-7 text-accent" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">No property selected</h2>
        <p className="text-muted-foreground">
          Select a property to manage its knowledge base.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-sm text-muted-foreground">Loading knowledge base…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Documents the AI receptionist uses to answer caller questions.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Document
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-accent" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add FAQs, policies, hours, and location info so the AI can answer callers.
            </p>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {CATEGORIES.map((category) => {
            const docs = grouped[category];
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-display font-semibold text-base">{meta.label}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {docs.length}
                  </Badge>
                </div>
                {docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 italic pl-6">
                    No {meta.label.toLowerCase()} documents.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {docs.map((doc) => (
                      <Card key={doc.id} className="flex flex-col">
                        <CardHeader className="space-y-2 pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base font-display leading-tight">
                              {doc.title}
                            </CardTitle>
                            <Badge variant={meta.badge} className="text-xs capitalize flex-shrink-0">
                              {doc.category}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                          <p className="text-sm text-muted-foreground line-clamp-4 flex-1">
                            {truncate(doc.content, 160)}
                          </p>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">
                              Updated {formatDate(doc.updated_at)}
                            </span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(doc)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(doc.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Document' : 'Add Document'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the knowledge document details.'
                : 'Create a new knowledge document for the AI receptionist.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g. What are your opening hours?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                placeholder="The full answer or information the AI should relay…"
                rows={5}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value as Category })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_META[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Save Changes' : 'Add Document'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The document will be permanently removed from the
              knowledge base.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
