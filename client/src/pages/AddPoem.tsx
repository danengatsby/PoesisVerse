import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePoems } from "@/hooks/usePoems";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema pentru validarea formularului
const formSchema = z.object({
  title: z.string().min(3, {
    message: "Titlul poemului trebuie să aibă cel puțin 3 caractere.",
  }),
  content: z.string().min(10, {
    message: "Conținutul poemului trebuie să aibă cel puțin 10 caractere.",
  }),
  author: z.string().min(2, {
    message: "Numele autorului trebuie să aibă cel puțin 2 caractere.",
  }),
  description: z.string().optional(),
  year: z.string().optional(),
  category: z.string().min(1, {
    message: "Vă rugăm să selectați o categorie.",
  }),
  isPremium: z.boolean().default(false),
  imageUrl: z.string().optional(),
  audioUrl: z.string().optional(),
  imageFile: z.any().optional(),
  audioFile: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddPoem({ match }: { match?: { params: Record<string, string> } }) {
  const { isAuthenticated } = useAuth();
  const { refetchPoems } = usePoems(); // Adăugăm refetchPoems pentru a reîmprospăta lista
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State pentru fișierele încărcate și preview-uri
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  
  // Debugging la început
  console.log("AddPoem: Match recepționat:", JSON.stringify(match), "Path:", window.location.pathname);
  
  // Extragem id-ul din URL dacă params este undefined sau null
  const urlId = window.location.pathname.split('/').pop();
  
  // Verificăm dacă suntem în modul de editare - folosim cu prioritate id-ul din URL
  const poemId = urlId ? parseInt(urlId) : (match?.params?.id ? parseInt(match.params.id) : null);
  const isEditMode = !!poemId && !isNaN(poemId);
  const [isLoading, setIsLoading] = useState(isEditMode);
  
  console.log("AddPoem: Mode =", isEditMode ? "EDIT" : "ADD", "ID =", poemId, 
              "URL ID =", urlId,
              "Match Params:", JSON.stringify(match?.params));
  
  // Debugging suplimentar
  useEffect(() => {
    console.log("AddPoem component rendered with params:", 
                JSON.stringify(match?.params), 
                "URL ID:", urlId,
                "Final ID:", poemId, 
                "Edit mode:", isEditMode);
  }, [match, poemId, isEditMode, urlId]);

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

  // Funcție pentru gestionarea încărcării imagini
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio') => {
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
        // Actualizăm formularul cu baza64 pentru a putea fi trimis la server
        form.setValue('imageUrl', resizedImageUrl);
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
        // Pentru fisierul audio, stocăm URL-ul pentru a-l putea trimite la server
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            const audioUrl = event.target.result as string;
            setAudioFile(file);
            setAudioName(file.name);
            form.setValue('audioUrl', audioUrl);
          }
        };
        reader.readAsDataURL(file);
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
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      content: "",
      author: "",
      description: "",
      year: "",
      category: "",
      isPremium: false,
      imageUrl: "",
      audioUrl: "",
    },
  });

  // Încărcăm datele poemului în caz că suntem în modul de editare
  useEffect(() => {
    if (isEditMode && poemId) {
      const fetchPoemData = async () => {
        try {
          setIsLoading(true);
          const response = await apiRequest("GET", `/api/poems/${poemId}`);
          
          if (response.ok) {
            const poemData = await response.json();
            
            // Populăm formularul cu datele poemului
            form.reset({
              title: poemData.title,
              content: poemData.content,
              author: poemData.author,
              description: poemData.description || "",
              year: poemData.year || "",
              category: poemData.category || "",
              isPremium: poemData.isPremium,
              imageUrl: poemData.imageUrl || "",
              audioUrl: poemData.audioUrl || "",
            });
            
            // Setăm preview-urile dacă există
            if (poemData.imageUrl) {
              setImagePreview(poemData.imageUrl);
            }
            
            if (poemData.audioUrl) {
              setAudioName("Fisier audio existent");
              console.log("Audio URL încărcat din server:", poemData.audioUrl.substring(0, 50) + "...");
            }
          } else {
            toast({
              variant: "destructive",
              title: "Eroare",
              description: "Nu s-a putut încărca poemul pentru editare.",
            });
            setLocation("/");
          }
        } catch (error) {
          console.error("Eroare la încărcarea poemului:", error);
          toast({
            variant: "destructive",
            title: "Eroare",
            description: "Nu s-a putut încărca poemul pentru editare.",
          });
          setLocation("/");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchPoemData();
    }
  }, [isEditMode, poemId, form, toast, setLocation]);

  async function onSubmit(values: FormValues) {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Trebuie să fiți autentificat",
        description: "Vă rugăm să vă autentificați pentru a adăuga sau edita un poem.",
      });
      return;
    }

    setIsPending(true);
    try {
      console.log("Valori de trimis la server:", { 
        titlu: values.title,
        autor: values.author,
        audioUrl_length: values.audioUrl?.length || 0,
        imageUrl_length: values.imageUrl?.length || 0
      });
      
      // Dacă nu avem URL-uri pentru imagini, dar avem preview-uri, le folosim
      const dataToSend = {
        ...values,
        // Dacă există preview, asigură-te că este trimis corespunzător
        imageUrl: values.imageUrl || imagePreview || "",
        audioUrl: values.audioUrl || "", // Păstrăm audioUrl dacă există
      };
      
      let response;
      
      if (isEditMode && poemId) {
        // Actualizăm poemul existent
        response = await apiRequest("PUT", `/api/poems/${poemId}`, dataToSend);
      } else {
        // Adăugăm un poem nou
        response = await apiRequest("POST", "/api/poems", dataToSend);
      }
      
      if (response.ok) {
        // Actualizăm lista de poeme
        await refetchPoems();
        
        toast({
          title: isEditMode ? "Poem actualizat" : "Poem adăugat",
          description: isEditMode 
            ? "Poemul a fost actualizat cu succes!" 
            : "Poemul a fost adăugat cu succes!",
        });
        setLocation("/");
      } else {
        const error = await response.json();
        throw new Error(error.message || `A apărut o eroare la ${isEditMode ? 'actualizarea' : 'adăugarea'} poemului`);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || `A apărut o eroare la ${isEditMode ? 'actualizarea' : 'adăugarea'} poemului`,
      });
    } finally {
      setIsPending(false);
    }
  }

  // Afișăm un indicator de încărcare în timp ce încărcăm datele poemului pentru editare
  if (isLoading) {
    return (
      <div className="container max-w-3xl py-10 flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Se încarcă datele poemului...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? 'Editare poem' : 'Adăugare poem nou'}
      </h1>
      <Separator className="mb-8" />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titlu</FormLabel>
                  <FormControl>
                    <Input placeholder="Titlul poemului" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Autor</FormLabel>
                  <FormControl>
                    <Input placeholder="Numele autorului" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conținut</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Introduceți textul poemului aici..." 
                    className="min-h-[200px]" 
                    {...field} 
                  />
                </FormControl>
                <FormDescription>
                  Introduceți textul complet al poemului. Folosiți Enter pentru a separa versurile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categorie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selectați o categorie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lyric">Liric</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="romantic">Romantic</SelectItem>
                      <SelectItem value="modernist">Modernist</SelectItem>
                      <SelectItem value="contemporary">Contemporan</SelectItem>
                      <SelectItem value="other">Altele</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anul publicării</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: 1923" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descriere</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="O scurtă descriere sau context pentru poem..." 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Imagine</FormLabel>
                  <div className="flex gap-2">
                    <FormControl className="flex-1">
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <label htmlFor="image-upload" className="cursor-pointer inline-block min-w-[80px]">
                      <div className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center h-full">
                        Încarcă
                      </div>
                      <input
                        id="image-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'image')}
                      />
                    </label>
                  </div>
                  {imagePreview && (
                    <div className="mt-2">
                      <p className="text-sm mb-1">Previzualizare:</p>
                      <img 
                        src={imagePreview} 
                        alt="Previzualizare imagine" 
                        className="max-w-full h-auto max-h-40 object-contain border rounded"
                      />
                    </div>
                  )}
                  <FormDescription>
                    URL-ul imaginii sau încarcă de pe calculator
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="audioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fișier Audio</FormLabel>
                  <div className="flex gap-2">
                    <FormControl className="flex-1">
                      <Input placeholder="https://example.com/audio.mp3" {...field} />
                    </FormControl>
                    <label htmlFor="audio-upload" className="cursor-pointer inline-block min-w-[80px]">
                      <div className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center h-full">
                        Încarcă
                      </div>
                      <input
                        id="audio-upload"
                        type="file"
                        className="hidden"
                        accept="audio/*"
                        onChange={(e) => handleImageUpload(e, 'audio')}
                      />
                    </label>
                  </div>
                  {audioName && (
                    <div className="mt-2">
                      <p className="text-sm mb-1">Fișier selectat:</p>
                      <div className="text-sm p-2 border rounded bg-gray-50">
                        {audioName}
                      </div>
                    </div>
                  )}
                  <FormDescription>
                    URL-ul fișierului audio sau încarcă de pe calculator
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="isPremium"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Conținut premium</FormLabel>
                  <FormDescription>
                    Bifați această opțiune dacă poemul ar trebui să fie disponibil doar utilizatorilor cu abonament premium.
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end space-x-4">
            <Button variant="outline" type="button" onClick={() => setLocation("/")}>
              Anulare
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending 
                ? (isEditMode ? "Se actualizează..." : "Se adaugă...") 
                : (isEditMode ? "Actualizează poem" : "Adaugă poem")
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}