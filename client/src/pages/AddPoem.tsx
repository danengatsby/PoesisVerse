import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePoems } from "@/hooks/usePoems";

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
  thumbnailUrl: z.string().optional(),
  imageFile: z.any().optional(),
  thumbnailFile: z.any().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddPoem() {
  const { isAuthenticated } = useAuth();
  const { refetchPoems } = usePoems(); // Adăugăm refetchPoems pentru a reîmprospăta lista
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State pentru fișierele încărcate și preview-uri
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

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
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'thumbnail') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    try {
      // Redimensionăm imaginea (dimensiuni diferite pentru imagine și thumbnail)
      const maxWidth = type === 'image' ? 1200 : 300;
      const maxHeight = type === 'image' ? 1200 : 300;
      
      const resizedImageUrl = await resizeImage(file, maxWidth, maxHeight);
      
      if (type === 'image') {
        setImageFile(file);
        setImagePreview(resizedImageUrl);
        // Actualizăm formularul cu baza64 pentru a putea fi trimis la server
        form.setValue('imageUrl', resizedImageUrl);
      } else {
        setThumbnailFile(file);
        setThumbnailPreview(resizedImageUrl);
        form.setValue('thumbnailUrl', resizedImageUrl);
      }
    } catch (error) {
      console.error('Eroare la redimensionarea imaginii:', error);
      toast({
        variant: "destructive",
        title: "Eroare",
        description: "Nu s-a putut procesa imaginea. Încercați altă imagine.",
      });
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
      thumbnailUrl: "",
    },
  });

  async function onSubmit(values: FormValues) {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Trebuie să fiți autentificat",
        description: "Vă rugăm să vă autentificați pentru a adăuga un poem nou.",
      });
      return;
    }

    setIsPending(true);
    try {
      // Dacă nu avem URL-uri pentru imagini, dar avem preview-uri, le folosim
      const dataToSend = {
        ...values,
        // Dacă există preview, asigură-te că este trimis corespunzător
        imageUrl: values.imageUrl || imagePreview || "",
        thumbnailUrl: values.thumbnailUrl || thumbnailPreview || "",
      };
      
      const response = await apiRequest("POST", "/api/poems", dataToSend);
      
      if (response.ok) {
        // Actualizăm lista de poeme
        await refetchPoems();
        
        toast({
          title: "Poem adăugat",
          description: "Poemul a fost adăugat cu succes!",
        });
        setLocation("/");
      } else {
        const error = await response.json();
        throw new Error(error.message || "A apărut o eroare la adăugarea poemului");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Eroare",
        description: error.message || "A apărut o eroare la adăugarea poemului",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-bold mb-6">Adăugare poem nou</h1>
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
                    <FormControl>
                      <Input placeholder="https://example.com/image.jpg" {...field} />
                    </FormControl>
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <div className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
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
              name="thumbnailUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Miniatură</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="https://example.com/thumbnail.jpg" {...field} />
                    </FormControl>
                    <label htmlFor="thumbnail-upload" className="cursor-pointer">
                      <div className="px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                        Încarcă
                      </div>
                      <input
                        id="thumbnail-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'thumbnail')}
                      />
                    </label>
                  </div>
                  {thumbnailPreview && (
                    <div className="mt-2">
                      <p className="text-sm mb-1">Previzualizare:</p>
                      <img 
                        src={thumbnailPreview} 
                        alt="Previzualizare miniatură" 
                        className="max-w-full h-auto max-h-40 object-contain border rounded"
                      />
                    </div>
                  )}
                  <FormDescription>
                    URL-ul miniaturii sau încarcă de pe calculator
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
              {isPending ? "Se adaugă..." : "Adaugă poem"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}