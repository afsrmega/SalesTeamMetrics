
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useClientsData } from '@/hooks/useClientsData';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { getRapportMetrics } from '@/lib/clientTouchpointsService';
import TopClientsTable from '@/components/prospects/TopClientsTable';
import RapportPlanDrawer from './RapportPlanDrawer';
import RapportMetrics from './RapportMetrics';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ClientHistoryDrawer from './ClientHistoryDrawer';
import { useReminders } from '@/hooks/useReminders';
import { format, formatDistanceToNow } from 'date-fns';
import ClientsFilterPanel from './ClientsFilterPanel';
import { getAvailableTags } from '@/lib/tagsService';
import { buildClientTagsMap } from '@/lib/clientsService';

// Segments Service and Modals
import { getSavedSegments, createSavedSegment, updateSavedSegment, deleteSavedSegment, toggleFavorite } from '@/lib/savedSegmentsService';
import SavedSegmentsModal from '@/components/common/SavedSegmentsModal';
import RenameSegmentModal from '@/components/common/RenameSegmentModal';
import DeleteSegmentModal from '@/components/common/DeleteSegmentModal';

const defaultFilters = {
  search: ''
};

const ClientsPage = () => {
  const { user } = useAuth();
  const { clients, loading: clientsLoading, error, refetch } = useClientsData();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState(defaultFilters);
  const [availableTags, setAvailableTags] = useState([]);
  const [includeTagIds, setIncludeTagIds] = useState([]);
  const [excludeTagIds, setExcludeTagIds] = useState([]);
  const [includeMode, setIncludeMode] = useState('any'); // 'any' or 'all'
  const [clientTagsMap, setClientTagsMap] = useState({});
  const [tagsLoading, setTagsLoading] = useState(true);

  // Segments State
  const [savedSegments, setSavedSegments] = useState([]);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isLoadingSegments, setIsLoadingSegments] = useState(true);
  
  const [isSaveSegmentModalOpen, setIsSaveSegmentModalOpen] = useState(false);
  const [isRenameSegmentModalOpen, setIsRenameSegmentModalOpen] = useState(false);
  const [isDeleteSegmentModalOpen, setIsDeleteSegmentModalOpen] = useState(false);
  const [segmentActionId, setSegmentActionId] = useState(null);

  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [selectedClientForRapport, setSelectedClientForRapport] = useState(null);
  const [isRapportOpen, setIsRapportOpen] = useState(false);

  const [metrics, setMetrics] = useState(null);
  const { overdueList, upcomingList } = useReminders();

  useEffect(() => {
    if (!user) return;
    const fetchTags = async () => {
      try {
        const tags = await getAvailableTags(user.id);
        const uniqueTags = Array.from(new Map(tags.map(t => [t.id, t])).values());
        setAvailableTags(uniqueTags);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTags();
  }, [user]);

  useEffect(() => {
    if (!clients || clients.length === 0) {
      setClientTagsMap({});
      setTagsLoading(false);
      return;
    }
    const buildMap = async () => {
      setTagsLoading(true);
      try {
        const map = await buildClientTagsMap(clients);
        setClientTagsMap(map);
      } catch (err) {
        console.error(err);
      } finally {
        setTagsLoading(false);
      }
    };
    buildMap();
  }, [clients]);

  // Load Segments
  const fetchSegments = useCallback(async () => {
    if (!user) return;
    setIsLoadingSegments(true);
    try {
      const data = await getSavedSegments(user.id, 'clients');
      setSavedSegments(data);
    } catch (err) {
      console.error('Failed to load segments', err);
    } finally {
      setIsLoadingSegments(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem('memberClientsFiltersV3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFilters(parsed.filters || defaultFilters);
        setIncludeTagIds(parsed.includeTagIds || []);
        setExcludeTagIds(parsed.excludeTagIds || []);
        setIncludeMode(parsed.includeMode || 'any');
      } catch (e) {
        console.error('Failed to parse clients filters', e);
      }
    }

    const savedSegment = localStorage.getItem('activeSegmentId:clients');
    if (savedSegment) {
      setActiveSegmentId(savedSegment);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem('memberClientsFiltersV3', JSON.stringify({ filters, includeTagIds, excludeTagIds, includeMode }));
    if (activeSegmentId) {
      localStorage.setItem('activeSegmentId:clients', activeSegmentId);
    } else {
      localStorage.removeItem('activeSegmentId:clients');
    }
  }, [filters, includeTagIds, excludeTagIds, includeMode, user, activeSegmentId]);

  useEffect(() => {
    if (user?.id) {
      getRapportMetrics(user.id).then(setMetrics).catch(console.error);
    }
  }, [user, clients]);

  // Segment Handlers
  const handleApplySegment = (id) => {
    const segment = savedSegments.find(s => s.id === id);
    if (segment && segment.filters) {
      setFilters(segment.filters.filters || defaultFilters);
      setIncludeTagIds(segment.filters.includeTagIds || []);
      setExcludeTagIds(segment.filters.excludeTagIds || []);
      setIncludeMode(segment.filters.includeMode || 'any');
      setActiveSegmentId(id);
      toast({ description: `Segmento '${segment.name}' aplicado.` });
    }
  };

  const handleSaveSegment = async (name, isFavorite) => {
    try {
      const payload = { filters, includeTagIds, excludeTagIds, includeMode };
      const newSegment = await createSavedSegment(user.id, 'clients', name, payload, isFavorite);
      setSavedSegments(prev => [newSegment, ...prev]);
      setActiveSegmentId(newSegment.id);
      toast({ description: "Segmento guardado exitosamente." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleRenameSegment = async (newName) => {
    try {
      await updateSavedSegment(segmentActionId, newName, undefined, undefined);
      await fetchSegments();
      toast({ description: "Segmento renombrado." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleUpdateSegmentFilters = async (id) => {
    try {
      const payload = { filters, includeTagIds, excludeTagIds, includeMode };
      await updateSavedSegment(id, undefined, payload, undefined);
      await fetchSegments();
      toast({ description: "Filtros del segmento actualizados." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteSegment = async () => {
    try {
      await deleteSavedSegment(segmentActionId);
      if (activeSegmentId === segmentActionId) {
        setActiveSegmentId(null);
      }
      await fetchSegments();
      toast({ description: "Segmento eliminado." });
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleToggleFavorite = async (id, isFavorite) => {
    try {
      await toggleFavorite(id, isFavorite);
      await fetchSegments();
    } catch (err) {
      toast({ title: "Error", description: "No se pudo actualizar favorito.", variant: "destructive" });
    }
  };

  const handleClearSegment = () => {
    setActiveSegmentId(null);
    setFilters(defaultFilters);
    setIncludeTagIds([]);
    setExcludeTagIds([]);
    setIncludeMode('any');
  };

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result = clients;
    
    // Search
    if (filters.search) {
      const term = filters.search.toLowerCase();
      result = result.filter(c => {
        const name = String(c.prospect_name || c.client_name || '').toLowerCase();
        const notes = (c.client_notes || '').toLowerCase();
        return name.includes(term) || notes.includes(term);
      });
    }

    // Apply Tags Filter using clientTagsMap
    if (Object.keys(clientTagsMap).length > 0) {
      if (includeTagIds.length > 0) {
        if (includeMode === 'any') {
          result = result.filter(c => {
            const cTags = clientTagsMap[c.id] || [];
            return cTags.some(ct => includeTagIds.includes(ct.id));
          });
        } else {
          result = result.filter(c => {
            const cTags = clientTagsMap[c.id] || [];
            return includeTagIds.every(tagId => cTags.some(ct => ct.id === tagId));
          });
        }
      }

      if (excludeTagIds.length > 0) {
        result = result.filter(c => {
          const cTags = clientTagsMap[c.id] || [];
          return !cTags.some(ct => excludeTagIds.includes(ct.id));
        });
      }
    }

    return result;
  }, [clients, filters, includeTagIds, excludeTagIds, includeMode, clientTagsMap]);

  const totalPotencial = filteredClients.reduce((sum, c) => sum + Number(c.estimated_property_value || 0), 0);
  const pendingCount = filteredClients.filter(c => c.pending_for_financials).length;
  const totalClients = filteredClients.length;

  const unimplementedToast = () => {
    toast({
      description: "🚧 This feature isn't implemented yet—but don't worry! You can request it in your next prompt! 🚀",
    });
  };

  const handleEdit = (client) => {
    unimplementedToast();
  };

  const handleMarkFinancials = (client) => {
    unimplementedToast();
  };

  const handleScheduleFollowUp = (client) => {
    unimplementedToast();
  };

  const handleViewRapport = (client) => {
    setSelectedClientForRapport(client);
    setIsRapportOpen(true);
  };

  const loading = clientsLoading || tagsLoading || isLoadingSegments;

  if (loading && (!clients || clients.length === 0)) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Mis Clientes</h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Hubo un problema al cargar los clientes: {error.message}
          </AlertDescription>
        </Alert>
      )}

      <RapportMetrics metrics={metrics} />

      {overdueList.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-bold mb-3 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> Overdue Touchpoints</h3>
          <div className="space-y-2">
            {overdueList.map(tp => (
              <div key={`overdue-tp-${tp.id}`} className="flex justify-between items-center bg-white p-3 rounded shadow-sm text-sm">
                <div>
                  <span className="font-semibold">{tp.clients?.prospect_name || 'Unknown'}</span>
                  <span className="text-muted-foreground ml-2">• Step {tp.step} ({tp.purpose})</span>
                  <span className="text-red-600 ml-2 block sm:inline mt-1 sm:mt-0">
                    Due: {format(new Date(tp.due_at), 'MMM d, yyyy')} ({formatDistanceToNow(new Date(tp.due_at))} ago)
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleViewRapport({id: tp.client_id, prospect_name: tp.clients?.prospect_name})}>
                  Plan
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ClientsFilterPanel 
        filters={filters}
        onFiltersChange={(newFilters) => { setFilters(newFilters); setActiveSegmentId(null); }}
        onReset={handleClearSegment}
        availableTags={availableTags}
        includeTagIds={includeTagIds}
        excludeTagIds={excludeTagIds}
        includeMode={includeMode}
        setIncludeTagIds={(ids) => { setIncludeTagIds(ids); setActiveSegmentId(null); }}
        setExcludeTagIds={(ids) => { setExcludeTagIds(ids); setActiveSegmentId(null); }}
        setIncludeMode={(mode) => { setIncludeMode(mode); setActiveSegmentId(null); }}
        
        savedSegments={savedSegments}
        activeSegmentId={activeSegmentId}
        onSaveSegmentClick={() => setIsSaveSegmentModalOpen(true)}
        onApplySegment={handleApplySegment}
        onRenameSegment={(id) => { setSegmentActionId(id); setIsRenameSegmentModalOpen(true); }}
        onUpdateSegment={handleUpdateSegmentFilters}
        onDeleteSegment={(id) => { setSegmentActionId(id); setIsDeleteSegmentModalOpen(true); }}
        onToggleFavorite={handleToggleFavorite}
        onClearSegment={handleClearSegment}
      />

      {(filters.search || includeTagIds.length > 0 || excludeTagIds.length > 0) && !activeSegmentId && (
        <div className="flex flex-wrap gap-2 items-center text-sm mb-4">
          <span className="text-muted-foreground font-medium">Filtros Activos:</span>
          {filters.search && <Badge variant="secondary">Búsqueda <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setFilters(prev => ({...prev, search: ''})); setActiveSegmentId(null); }} /></Badge>}
          {includeTagIds.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              Includes: {includeTagIds.length} ({includeMode}) <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setIncludeTagIds([]); setActiveSegmentId(null); }} />
            </Badge>
          )}
          {excludeTagIds.length > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-200">
              Excludes: {excludeTagIds.length} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => { setExcludeTagIds([]); setActiveSegmentId(null); }} />
            </Badge>
          )}
        </div>
      )}

      {/* Segment Modals */}
      <SavedSegmentsModal
        isOpen={isSaveSegmentModalOpen}
        onClose={() => setIsSaveSegmentModalOpen(false)}
        onSave={handleSaveSegment}
        scope="clients"
      />

      <RenameSegmentModal
        isOpen={isRenameSegmentModalOpen}
        onClose={() => { setIsRenameSegmentModalOpen(false); setSegmentActionId(null); }}
        onRename={handleRenameSegment}
        currentName={savedSegments.find(s => s.id === segmentActionId)?.name}
      />

      <DeleteSegmentModal
        isOpen={isDeleteSegmentModalOpen}
        onClose={() => { setIsDeleteSegmentModalOpen(false); setSegmentActionId(null); }}
        onDelete={handleDeleteSegment}
        segmentName={savedSegments.find(s => s.id === segmentActionId)?.name}
      />

      {/* KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Total Clientes</h3>
          <p className="text-3xl font-bold">{totalClients}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Valor Total Estimado</h3>
          <p className="text-3xl font-bold">${totalPotencial.toLocaleString()}</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-muted-foreground font-semibold mb-2">Pendientes de Finanzas</h3>
          <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Lista de Clientes</h2>
        <TopClientsTable 
          filteredClients={filteredClients} 
          isLoading={loading}
          onEdit={handleEdit}
          onMarkFinancials={handleMarkFinancials}
          onScheduleFollowUp={handleScheduleFollowUp}
          onViewRapport={handleViewRapport}
          refetch={refetch}
        />
      </div>

      <ClientHistoryDrawer 
        open={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        clientId={selectedClientForHistory} 
      />

      <RapportPlanDrawer
        isOpen={isRapportOpen}
        onClose={() => setIsRapportOpen(false)}
        clientId={selectedClientForRapport?.id}
        clientName={selectedClientForRapport?.prospect_name || selectedClientForRapport?.client_name || 'Client'}
      />
    </div>
  );
};

export default ClientsPage;
