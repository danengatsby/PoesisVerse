import { useState, useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import {
  Book,
  BookOpen,
  Crown,
  Filter,
  Loader2,
  Plus,
  Search,
  ArrowLeft,
  BarChart3,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Poem {
  id: number;
  title: string;
  author: string;
  content: string;
  description?: string;
  category?: string;
  year?: string;
  isPremium: boolean;
  imageUrl: string;
  audioUrl: string;
  createdAt?: string;
}

interface PoemStats {
  totalPoems: number;
  premiumPoems: number;
  freePoems: number;
  categories: { [key: string]: number };
  authorsCount: number;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [stats, setStats] = useState<PoemStats>({
    totalPoems: 0,
    premiumPoems: 0,
    freePoems: 0,
    categories: {},
    authorsCount: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPremium, setFilterPremium] = useState('all');

  // Verifică dacă utilizatorul este administrator
  const isAdmin = user?.username === 'Administrator';

  useEffect(() => {
    if (!isAdmin) return;
    
    // Încarcă datele pentru dashboard
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Încarcă statisticile administrative
        const statsResponse = await apiRequest('GET', '/api/admin/stats');
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats({
            totalPoems: statsData.totalPoems,
            premiumPoems: statsData.premiumPoems,
            freePoems: statsData.freePoems,
            categories: statsData.categories,
            authorsCount: statsData.authorsCount
          });
        } else {
          toast({
            title: 'Eroare',
            description: 'Nu s-au putut încărca statisticile',
            variant: 'destructive',
          });
        }
        
        // Încarcă lista de poeme
        const poemsResponse = await apiRequest('GET', '/api/poems');
        if (poemsResponse.ok) {
          const poemsData = await poemsResponse.json();
          setPoems(poemsData);
        } else {
          toast({
            title: 'Eroare',
            description: 'Nu s-au putut încărca poemele',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Eroare la încărcarea datelor pentru dashboard:', error);
        toast({
          title: 'Eroare',
          description: 'A apărut o eroare la comunicarea cu serverul',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAdmin, toast]);

  // Calculează statisticile pe baza poemelor
  const calculateStats = (poemData: Poem[]) => {
    const newStats: PoemStats = {
      totalPoems: poemData.length,
      premiumPoems: poemData.filter(poem => poem.isPremium).length,
      freePoems: poemData.filter(poem => !poem.isPremium).length,
      categories: {},
      authorsCount: new Set(poemData.map(poem => poem.author)).size
    };

    // Calculează categoriile
    poemData.forEach(poem => {
      const category = poem.category || 'Necategorizat';
      if (newStats.categories[category]) {
        newStats.categories[category]++;
      } else {
        newStats.categories[category] = 1;
      }
    });

    setStats(newStats);
  };

  // Filtrează poemele
  const filteredPoems = poems.filter(poem => {
    // Filtrare după text
    const matchesSearch = 
      searchTerm === '' || 
      poem.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      poem.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poem.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtrare după categorie
    const matchesCategory = 
      filterCategory === 'all' || 
      (poem.category || 'Necategorizat') === filterCategory;
    
    // Filtrare premium/gratuit
    const matchesPremium = 
      filterPremium === 'all' || 
      (filterPremium === 'premium' && poem.isPremium) || 
      (filterPremium === 'free' && !poem.isPremium);
    
    return matchesSearch && matchesCategory && matchesPremium;
  });

  // Formatează data
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nespecificat';
    const date = new Date(dateString);
    return date.toLocaleDateString('ro-RO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Obține lista unică de categorii pentru filtru
  const categories = ['all', ...Object.keys(stats.categories)];

  // Redirecționează dacă utilizatorul nu este administrator
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button 
            onClick={() => navigate("/")} 
            variant="outline" 
            className="mr-4"
            title="Înapoi la pagina principală"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi
          </Button>
          <h1 className="text-3xl font-bold">Panou de administrare</h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => navigate("/poems-management")} variant="outline">
            Administrare poeme
          </Button>
          <Button onClick={() => navigate("/subscribers")} variant="outline">
            Administrare utilizatori
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Carduri de statistici */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Total poeme</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BookOpen className="h-10 w-10 text-primary mr-3" />
                  <div className="text-3xl font-bold">{stats.totalPoems}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Poeme premium</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Crown className="h-10 w-10 text-amber-500 mr-3" />
                  <div className="text-3xl font-bold">{stats.premiumPoems}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Autori unici</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="h-10 w-10 text-blue-500 mr-3" />
                  <div className="text-3xl font-bold">{stats.authorsCount}</div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Categorii</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="h-10 w-10 text-green-500 mr-3" />
                  <div className="text-3xl font-bold">{Object.keys(stats.categories).length}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribuția categoriilor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuția categoriilor</CardTitle>
                <CardDescription>
                  Numărul de poeme pe fiecare categorie
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col">
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(stats.categories).map(([category, count]) => (
                    <Badge key={category} variant="outline" className="px-3 py-1 text-sm">
                      {category}: {count}
                    </Badge>
                  ))}
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.categories).map(([name, value], index) => ({
                          name,
                          value
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {Object.entries(stats.categories).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={[
                              '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', 
                              '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'
                            ][index % 8]} 
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [value, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Premium vs Gratuit</CardTitle>
                <CardDescription>
                  Distribuția poemelor după tip
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: 'Premium', value: stats.premiumPoems },
                      { name: 'Gratuit', value: stats.freePoems }
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Bar dataKey="value" name="Număr poeme">
                      <Cell fill="#4f46e5" />
                      <Cell fill="#10b981" />
                    </Bar>
                    <RechartsTooltip formatter={(value) => [`${value} poeme`, ""]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Filtre și căutare */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Căutare după titlu, autor sau conținut..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-40">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate categoriile</SelectItem>
                    {categories.filter(c => c !== 'all').map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <Select value={filterPremium} onValueChange={setFilterPremium}>
                  <SelectTrigger>
                    <Crown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Tip" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate poemele</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="free">Gratuite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => navigate("/add-poem")} className="bg-primary">
                <Plus className="h-4 w-4 mr-2" />
                Adaugă poem
              </Button>
            </div>
          </div>

          {/* Tabel cu poeme */}
          <Card>
            <CardHeader>
              <CardTitle>Toate poemele</CardTitle>
              <CardDescription>
                {filteredPoems.length} poeme afișate din {poems.length} total
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">ID</TableHead>
                      <TableHead>Titlu</TableHead>
                      <TableHead>Autor</TableHead>
                      <TableHead>Categorie</TableHead>
                      <TableHead>Tip</TableHead>
                      <TableHead>Media</TableHead>
                      <TableHead>Data adăugării</TableHead>
                      <TableHead className="text-right">Acțiuni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPoems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          Nu au fost găsite poeme care să corespundă criteriilor de căutare.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPoems.map((poem) => (
                        <TableRow key={poem.id}>
                          <TableCell className="font-medium">{poem.id}</TableCell>
                          <TableCell className="font-medium">{poem.title}</TableCell>
                          <TableCell>{poem.author}</TableCell>
                          <TableCell>{poem.category || 'Necategorizat'}</TableCell>
                          <TableCell>
                            <Badge variant={poem.isPremium ? "default" : "secondary"}>
                              {poem.isPremium ? 'Premium' : 'Gratuit'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <TooltipProvider>
                                {poem.imageUrl && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="h-6 w-6 bg-blue-100 rounded-md flex items-center justify-center">
                                        <img
                                          src={poem.imageUrl}
                                          alt="thumbnail"
                                          className="h-4 w-4 object-cover"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Imagine disponibilă</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                {poem.audioUrl && (
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <div className="h-6 w-6 bg-green-100 rounded-md flex items-center justify-center">
                                        <MessageSquare className="h-4 w-4 text-green-700" />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Audio disponibil</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(poem.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/edit-poem/${poem.id}`)}
                            >
                              Editează
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}