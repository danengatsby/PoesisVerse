import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Pencil, Trash, Plus, X, Check, FileText, ArrowLeft, Upload, Music } from "lucide-react";
import { Redirect, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Poem {
  id: number;
  title: string;
  content: string;
  author: string;
  imageUrl: string;
  audioUrl: string;
  description?: string;
  year?: string;
  category?: string;
  isPremium: boolean;
  createdAt?: string;
}

interface NewPoemFormData {
  title: string;
  content: string;
  author: string;
  imageUrl: string;
  audioUrl: string;
  description: string;
  year: string;
  category: string;
  isPremium: boolean;
}

interface EditPoemFormData extends NewPoemFormData {}

export default function PoemManagement() {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  
  // Funcție pentru redimensionarea imaginilor înainte de încărcare
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          // Calculăm noile dimensiuni păstrând raportul de aspect
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          // Creăm un canvas pentru redimensionare
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Desenăm imaginea redimensionată
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Nu s-a putut obține contextul canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convertim canvas-ul în URL base64 cu compresie
          const quality = 0.7; // Ajustează calitatea pentru a reduce dimensiunea
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error('Eroare la încărcarea imaginii'));
        };
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.onerror = () => {
        reject(new Error('Eroare la citirea fișierului'));
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Funcție pentru gestionarea încărcării fișierelor
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio', isEdit: boolean = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (type === 'image') {
      try {
        // Redimensionăm imaginea
        const maxWidth = 1200;
        const maxHeight = 1200;
        
        const resizedImageUrl = await resizeImage(file, maxWidth, maxHeight);
        
        setImageFile(file);
        setImagePreview(resizedImageUrl);
        
        // Actualizăm formularul în funcție de context (adăugare sau editare)
        if (isEdit) {
          setEditPoem({ ...editPoem, imageUrl: resizedImageUrl });
        } else {
          setNewPoem({ ...newPoem, imageUrl: resizedImageUrl });
        }
      } catch (error) {
        console.error('Eroare la redimensionarea imaginii:', error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-a putut procesa imaginea. Încercați altă imagine.",
        });
      }
    } else {
      // Procesare fișier audio
      try {
        // Transformăm citirea fișierului audio într-o promisiune pentru a o face sincronă
        const audioUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error('Failed to read audio file'));
            }
          };
          reader.onerror = () => reject(new Error('Error reading audio file'));
          reader.readAsDataURL(file);
        });
        
        // După ce am obținut URL-ul audio, actualizăm starea
        setAudioFile(file);
        setAudioName(file.name);
        
        // Actualizăm formularul în funcție de context (adăugare sau editare)
        if (isEdit) {
          console.log('Setting audio URL in edit mode:', audioUrl.substring(0, 50) + '...');
          setEditPoem({ ...editPoem, audioUrl: audioUrl });
        } else {
          console.log('Setting audio URL in add mode:', audioUrl.substring(0, 50) + '...');
          setNewPoem({ ...newPoem, audioUrl: audioUrl });
        }
      } catch (error) {
        console.error('Eroare la încărcarea fișierului audio:', error);
        toast({
          variant: "destructive",
          title: "Eroare",
          description: "Nu s-a putut procesa fișierul audio. Încercați alt fișier.",
        });
      }
    }
  };

  const [newPoem, setNewPoem] = useState<NewPoemFormData>({
    title: '',
    content: '',
    author: '',
    imageUrl: '',
    audioUrl: '',
    description: '',
    year: '',
    category: '',
    isPremium: false
  });
  const [editPoem, setEditPoem] = useState<EditPoemFormData>({
    title: '',
    content: '',
    author: '',
    imageUrl: '',
    audioUrl: '',
    description: '',
    year: '',
    category: '',
    isPremium: false
  });
  const [currentEditPoemId, setCurrentEditPoemId] = useState<number | null>(null);
  const [addingPoem, setAddingPoem] = useState(false);
  const [updatingPoem, setUpdatingPoem] = useState(false);
  const [deletingPoem, setDeletingPoem] = useState(false);

  // Verifică dacă utilizatorul este Administrator
  const isAdmin = user?.username === "Administrator";

  const fetchPoems = async () => {
    if (!isAdmin) return;

    try {
      setIsLoading(true);
      const response = await apiRequest("GET", "/api/poems");
      if (response.ok) {
        const data = await response.json();
        setPoems(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "A apărut o eroare la încărcarea poemelor");
        toast({
          title: "Eroare de încărcare",
          description: errorData.message || "A apărut o eroare la încărcarea poemelor",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setError(error.message || "A apărut o eroare la încărcarea poemelor");
      toast({
        title: "Eroare de încărcare",
        description: error.message || "A apărut o eroare la încărcarea poemelor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPoems();
  }, [isAdmin, toast]);

  // Dacă utilizatorul nu este Administrator, redirecționează la pagina principală
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  // Formatare dată pentru afișare
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "Nespecificat";
    const date = new Date(dateString);
    return date.toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleAddPoem = async () => {
    if (!newPoem.title || !newPoem.content || !newPoem.author) {
      toast({
        title: "Date incomplete",
        description: "Titlul, conținutul și autorul sunt obligatorii.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingPoem(true);
      const response = await apiRequest("POST", "/api/poems", newPoem);
      
      if (response.ok) {
        const addedPoem = await response.json();
        toast({
          title: "Poem adăugat",
          description: `Poemul "${addedPoem.title}" a fost adăugat cu succes.`,
        });
        setNewPoem({
          title: '',
          content: '',
          author: '',
          imageUrl: '',
          audioUrl: '',
          description: '',
          year: '',
          category: '',
          isPremium: false
        });
        setShowAddDialog(false);
        fetchPoems();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la adăugare",
          description: errorData.message || "A apărut o eroare la adăugarea poemului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la adăugare",
        description: error.message || "A apărut o eroare la adăugarea poemului.",
        variant: "destructive",
      });
    } finally {
      setAddingPoem(false);
    }
  };

  const [, setLocation] = useLocation();
  
  const handleEditPoem = (poem: Poem) => {
    // În loc să deschidem dialogul, navigăm către pagina de editare
    setLocation(`/edit-poem/${poem.id}`);
  };
  
  const handleEditPoemInDialog = (poem: Poem) => {
    // Păstrăm și opțiunea de a edita în dialog pentru cazuri particulare
    setEditPoem({
      title: poem.title,
      content: poem.content,
      author: poem.author,
      imageUrl: poem.imageUrl || '',
      audioUrl: poem.audioUrl || '',
      description: poem.description || '',
      year: poem.year || '',
      category: poem.category || '',
      isPremium: poem.isPremium
    });
    setCurrentEditPoemId(poem.id);
    setShowEditDialog(true);
  };

  const handleUpdatePoem = async () => {
    if (!currentEditPoemId || !editPoem.title || !editPoem.content || !editPoem.author) {
      toast({
        title: "Date incomplete",
        description: "Titlul, conținutul și autorul sunt obligatorii.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUpdatingPoem(true);
      console.log('Sending poem update with audioUrl:', editPoem.audioUrl ? 'Audio URL present (length: ' + editPoem.audioUrl.length + ')' : 'No audio URL');
      const response = await apiRequest("PUT", `/api/poems/${currentEditPoemId}`, editPoem);
      
      if (response.ok) {
        const updatedPoem = await response.json();
        toast({
          title: "Poem actualizat",
          description: `Poemul "${updatedPoem.title}" a fost actualizat cu succes.`,
        });
        setShowEditDialog(false);
        fetchPoems();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la actualizare",
          description: errorData.message || "A apărut o eroare la actualizarea poemului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error updating poem:', error);
      toast({
        title: "Eroare la actualizare",
        description: error.message || "A apărut o eroare la actualizarea poemului.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPoem(false);
    }
  };

  const handleDeletePoem = async (poemId: number) => {
    try {
      setDeletingPoem(true);
      const response = await apiRequest("DELETE", `/api/poems/${poemId}`);
      
      if (response.ok) {
        toast({
          title: "Poem șters",
          description: "Poemul a fost șters cu succes.",
        });
        fetchPoems();
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la ștergere",
          description: errorData.message || "A apărut o eroare la ștergerea poemului.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Eroare la ștergere",
        description: error.message || "A apărut o eroare la ștergerea poemului.",
        variant: "destructive",
      });
    } finally {
      setDeletingPoem(false);
    }
  };

  // Funcție pentru afișarea poemului trunchiat
  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <div className="container mx-auto py-4 px-4 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
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
          <h1 className="text-2xl font-bold">Administrare poeme</h1>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-green-600 hover:bg-green-700">
          <FileText className="h-4 w-4 mr-2" />
          Adaugă poem
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-500 border border-red-200">
          {error}
        </div>
      ) : poems.length === 0 ? (
        <div className="bg-amber-50 p-4 rounded-md text-amber-700 border border-amber-200">
          Nu există poeme înregistrate momentan.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            <table className="w-full bg-white shadow-md rounded-lg">
              <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titlu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Autor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conținut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premium</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data adăugării</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {poems.map((poem) => (
                  <tr key={poem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{poem.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{poem.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{poem.author}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-[300px] truncate">{truncateContent(poem.content)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        poem.isPremium 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {poem.isPremium ? 'Premium' : 'Gratuit'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{poem.category || 'Necategorizat'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(poem.createdAt)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditPoem(poem)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editează
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          >
                            <Trash className="h-3.5 w-3.5 mr-1" />
                            Șterge
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmare ștergere</AlertDialogTitle>
                            <AlertDialogDescription>
                              Sunteți sigur că doriți să ștergeți poemul "{poem.title}"? 
                              Această acțiune nu poate fi anulată și toate datele asociate vor fi șterse.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Anulează</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeletePoem(poem.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              {deletingPoem ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Trash className="h-4 w-4 mr-2" />
                              )}
                              Șterge
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog pentru adăugare poem */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adaugă poem nou</DialogTitle>
            <DialogDescription>
              Introduceți datele pentru noul poem. Titlul, conținutul și autorul sunt obligatorii.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Titlu
              </Label>
              <Input
                id="title"
                value={newPoem.title}
                onChange={(e) => setNewPoem({ ...newPoem, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="author" className="text-right">
                Autor
              </Label>
              <Input
                id="author"
                value={newPoem.author}
                onChange={(e) => setNewPoem({ ...newPoem, author: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="content" className="text-right pt-2">
                Conținut
              </Label>
              <Textarea
                id="content"
                value={newPoem.content}
                onChange={(e) => setNewPoem({ ...newPoem, content: e.target.value })}
                className="col-span-3 min-h-[150px]"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Descriere
              </Label>
              <Input
                id="description"
                value={newPoem.description}
                onChange={(e) => setNewPoem({ ...newPoem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Categorie
              </Label>
              <Input
                id="category"
                value={newPoem.category}
                onChange={(e) => setNewPoem({ ...newPoem, category: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                An
              </Label>
              <Input
                id="year"
                value={newPoem.year}
                onChange={(e) => setNewPoem({ ...newPoem, year: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="imageUpload" className="text-right pt-2">
                Imagine
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      className="text-blue-600 hover:text-blue-800" 
                      title="Încarcă imagine"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {imagePreview && (
                  <div className="relative rounded-md overflow-hidden border w-48 h-auto">
                    <img src={imagePreview} alt="Previzualizare" className="w-full h-auto object-cover" />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setNewPoem({...newPoem, imageUrl: ''});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="audioUpload" className="text-right pt-2">
                Fișier Audio
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="audioUpload"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audio')}
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      className="text-blue-600 hover:text-blue-800" 
                      title="Încarcă fișier audio"
                    >
                      <Music className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {audioName && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Music className="h-4 w-4 text-blue-500" />
                    <span>{audioName}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 rounded-full p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setAudioName(null);
                        setAudioFile(null);
                        setNewPoem({...newPoem, audioUrl: ''});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 hidden">
              <Label htmlFor="imageUrl" className="text-right">
                URL Imagine (Automat)
              </Label>
              <Input
                id="imageUrl"
                value={newPoem.imageUrl}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 hidden">
              <Label htmlFor="audioUrl" className="text-right">
                URL Fișier Audio (Automat)
              </Label>
              <Input
                id="audioUrl"
                value={newPoem.audioUrl}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isPremium" className="text-right">
                Premium
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="isPremium"
                  checked={newPoem.isPremium}
                  onCheckedChange={(checked) => setNewPoem({ ...newPoem, isPremium: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Anulează
            </Button>
            <Button onClick={handleAddPoem} disabled={addingPoem}>
              {addingPoem ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adaugă
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pentru editare poem */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editează poem</DialogTitle>
            <DialogDescription>
              Modificați datele poemului. Titlul, conținutul și autorul sunt obligatorii.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-title" className="text-right">
                Titlu
              </Label>
              <Input
                id="edit-title"
                value={editPoem.title}
                onChange={(e) => setEditPoem({ ...editPoem, title: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-author" className="text-right">
                Autor
              </Label>
              <Input
                id="edit-author"
                value={editPoem.author}
                onChange={(e) => setEditPoem({ ...editPoem, author: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-content" className="text-right pt-2">
                Conținut
              </Label>
              <Textarea
                id="edit-content"
                value={editPoem.content}
                onChange={(e) => setEditPoem({ ...editPoem, content: e.target.value })}
                className="col-span-3 min-h-[150px]"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Descriere
              </Label>
              <Input
                id="edit-description"
                value={editPoem.description}
                onChange={(e) => setEditPoem({ ...editPoem, description: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-category" className="text-right">
                Categorie
              </Label>
              <Input
                id="edit-category"
                value={editPoem.category}
                onChange={(e) => setEditPoem({ ...editPoem, category: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-year" className="text-right">
                An
              </Label>
              <Input
                id="edit-year"
                value={editPoem.year}
                onChange={(e) => setEditPoem({ ...editPoem, year: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-imageUpload" className="text-right pt-2">
                Imagine
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-imageUpload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image', true)}
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      className="text-blue-600 hover:text-blue-800" 
                      title="Încarcă imagine"
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(imagePreview || editPoem.imageUrl) && (
                  <div className="relative rounded-md overflow-hidden border w-48 h-auto">
                    <img 
                      src={imagePreview || editPoem.imageUrl} 
                      alt="Previzualizare" 
                      className="w-full h-auto object-cover" 
                    />
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="absolute top-2 right-2 h-6 w-6 rounded-full p-0"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        setEditPoem({...editPoem, imageUrl: ''});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-audioUpload" className="text-right pt-2">
                Fișier Audio
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    id="edit-audioUpload"
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileUpload(e, 'audio', true)}
                    className="flex-1"
                  />
                  <div className="flex shrink-0 items-center">
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      className="text-blue-600 hover:text-blue-800" 
                      title="Încarcă fișier audio"
                    >
                      <Music className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(audioName || editPoem.audioUrl) && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Music className="h-4 w-4 text-blue-500" />
                    <span>{audioName || 'Fișier audio existent'}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 rounded-full p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setAudioName(null);
                        setAudioFile(null);
                        setEditPoem({...editPoem, audioUrl: ''});
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4 hidden">
              <Label htmlFor="edit-imageUrl" className="text-right">
                URL Imagine (Automat)
              </Label>
              <Input
                id="edit-imageUrl"
                value={editPoem.imageUrl}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4 hidden">
              <Label htmlFor="edit-audioUrl" className="text-right">
                URL Fișier Audio (Automat)
              </Label>
              <Input
                id="edit-audioUrl"
                value={editPoem.audioUrl}
                readOnly
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-isPremium" className="text-right">
                Premium
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="edit-isPremium"
                  checked={editPoem.isPremium}
                  onCheckedChange={(checked) => setEditPoem({ ...editPoem, isPremium: checked })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Anulează
            </Button>
            <Button onClick={handleUpdatePoem} disabled={updatingPoem}>
              {updatingPoem ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}