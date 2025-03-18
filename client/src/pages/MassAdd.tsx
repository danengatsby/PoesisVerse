import React, { useState, ChangeEvent, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

// Definirea schemei de validare pentru formular
const formSchema = z.object({
  title: z.string().min(1, { message: "Titlul este obligatoriu" }),
  author: z.string().min(1, { message: "Autorul este obligatoriu" }),
  description: z.string().optional(),
  category: z.string().optional(),
  year: z.string().optional(),
  isPremium: z.boolean().default(false),
  poemsText: z.string().min(1, { message: "Conținutul poemelor este obligatoriu" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function MassAdd() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ success: number; failed: number } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      author: "",
      description: "",
      category: "",
      year: "",
      isPremium: false,
      poemsText: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!uploadedImage) {
      toast({
        title: "Imagine lipsă",
        description: "Vă rugăm să încărcați o imagine pentru poeme",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setResultSummary(null);

    try {
      // Parsează textul poemelor și împarte-le după delimitator
      const poems = values.poemsText.split("&&&").map(poem => poem.trim()).filter(poem => poem.length > 0);

      if (poems.length === 0) {
        toast({
          title: "Nu s-au găsit poeme",
          description: "Textul nu conține poeme valide separate prin &&&",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Prepară metadata comună pentru toate poemele
      const commonMetadata = {
        title: values.title,
        author: values.author,
        description: values.description || null,
        category: values.category || null,
        year: values.year || null,
        isPremium: values.isPremium,
        imageUrl: uploadedImage,
        audioUrl: uploadedAudio || null,
      };

      // Trimite cererea către server pentru adăugarea în masă a poemelor
      const response = await apiRequest("POST", "/api/poems/mass-add", {
        poems,
        metadata: commonMetadata,
      });

      if (response.ok) {
        const result = await response.json();
        setResultSummary({
          success: result.successCount || 0,
          failed: result.failedCount || 0,
        });
        
        toast({
          title: "Poeme adăugate cu succes",
          description: `${result.successCount} poeme au fost adăugate cu succes.`,
          variant: "default",
        });
        
        // Reset form dacă s-au adăugat poeme cu succes
        if (result.successCount > 0) {
          form.reset();
          setUploadedImage(null);
          setUploadedAudio(null);
        }
      } else {
        const errorData = await response.json();
        toast({
          title: "Eroare la adăugarea poemelor",
          description: errorData.message || "A apărut o eroare la adăugarea poemelor",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Eroare la adăugarea poemelor:", error);
      toast({
        title: "Eroare de procesare",
        description: "A apărut o eroare la procesarea cererii",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImageUploading(true);
    try {
      const resizedImage = await resizeImage(file, 1200, 800);
      setUploadedImage(resizedImage);
    } catch (error) {
      console.error("Eroare la procesarea imaginii:", error);
      toast({
        title: "Eroare la încărcarea imaginii",
        description: "Nu s-a putut procesa imaginea",
        variant: "destructive",
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleAudioUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificăm tipul fișierului
    if (!file.type.startsWith("audio/")) {
      toast({
        title: "Tip de fișier neacceptat",
        description: "Vă rugăm să încărcați un fișier audio",
        variant: "destructive",
      });
      return;
    }

    setIsAudioUploading(true);
    try {
      // Convertim fișierul audio în base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const audioBase64 = event.target?.result as string;
        setUploadedAudio(audioBase64);
        setIsAudioUploading(false);
      };
      reader.onerror = () => {
        throw new Error("Eroare la citirea fișierului audio");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Eroare la procesarea fișierului audio:", error);
      toast({
        title: "Eroare la încărcarea fișierului audio",
        description: "Nu s-a putut procesa fișierul audio",
        variant: "destructive",
      });
      setIsAudioUploading(false);
    }
  };

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          // Draw resized image
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64
          const dataUrl = canvas.toDataURL(file.type);
          resolve(dataUrl);
        };
        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  };

  const { isAuthenticated, isLoading } = useAuth();
  
  // Redirect dacă utilizatorul nu este autentificat
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // Componenta este wrapped cu ProtectedRoute în App.tsx, deci nu avem nevoie să facem redirect aici
  }

  return (
    <div className="container mx-auto py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Adăugare în masă a poemelor</CardTitle>
            <CardDescription>
              Adaugă mai multe poeme odată, separate prin "&&&" în text, cu metadata comună
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Metadate comune */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Metadate comune</h3>
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Titlul comun</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Colecție de poezii românești" {...field} />
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
                            <Input placeholder="Ex: Mihai Eminescu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descriere (opțional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="O scurtă descriere a colecției..." 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categorie (opțional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Lirică" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="year"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>An (opțional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: 1889" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="isPremium"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Conținut premium</FormLabel>
                            <CardDescription className="text-xs">
                              Poemele vor fi disponibile doar utilizatorilor abonați
                            </CardDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Încărcare imagine */}
                    <div className="space-y-2">
                      <Label>Imagine (obligatoriu)</Label>
                      <div className="flex flex-col items-center border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors hover:border-primary/50 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          ref={imageInputRef}
                        />
                        
                        {uploadedImage ? (
                          <div className="space-y-4 w-full">
                            <div className="relative h-40 w-full">
                              <img
                                src={uploadedImage}
                                alt="Previzualizare imagine"
                                className="h-full w-full object-contain rounded-md"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => imageInputRef.current?.click()}
                            >
                              Schimbă imaginea
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center gap-2 p-4 w-full"
                            onClick={() => imageInputRef.current?.click()}
                          >
                            {isImageUploading ? (
                              <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-10 w-10 text-gray-400" />
                                <span className="text-gray-600 font-medium">
                                  Click pentru a încărca o imagine
                                </span>
                                <span className="text-gray-400 text-sm">
                                  PNG, JPG, GIF până la 5MB
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Încărcare audio */}
                    <div className="space-y-2">
                      <Label>Fișier audio (opțional)</Label>
                      <div className="flex flex-col items-center border-2 border-dashed border-gray-300 rounded-lg p-4 transition-colors hover:border-primary/50 cursor-pointer">
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={handleAudioUpload}
                          className="hidden"
                          ref={audioInputRef}
                        />
                        
                        {uploadedAudio ? (
                          <div className="space-y-4 w-full">
                            <audio
                              controls
                              src={uploadedAudio}
                              className="w-full"
                            >
                              Browserul dvs. nu suportă redarea audio.
                            </audio>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => audioInputRef.current?.click()}
                            >
                              Schimbă fișierul audio
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="flex flex-col items-center justify-center gap-2 p-4 w-full"
                            onClick={() => audioInputRef.current?.click()}
                          >
                            {isAudioUploading ? (
                              <Loader2 className="h-10 w-10 text-gray-400 animate-spin" />
                            ) : (
                              <>
                                <Upload className="h-10 w-10 text-gray-400" />
                                <span className="text-gray-600 font-medium">
                                  Click pentru a încărca un fișier audio
                                </span>
                                <span className="text-gray-400 text-sm">
                                  MP3, WAV, OGG până la 10MB
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Poeme */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">
                      Conținutul poemelor 
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        (separate prin "&&&")
                      </span>
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="poemsText"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              placeholder={`Poem 1...\n\n&&&\n\nPoem 2...\n\n&&&\n\nPoem 3...`} 
                              className="min-h-[400px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                          <p className="text-sm text-gray-500 mt-2">
                            Introduceți fiecare poem separat prin &&&. Toate poemele vor avea aceleași metadate
                            (titlu, autor, imagine, etc).
                          </p>
                        </FormItem>
                      )}
                    />
                    
                    {resultSummary && (
                      <div className={`p-4 rounded-md ${
                        resultSummary.success > 0 
                          ? "bg-green-50 border border-green-200" 
                          : "bg-red-50 border border-red-200"
                      }`}>
                        <div className="flex items-start">
                          {resultSummary.success > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                          )}
                          <div>
                            <h4 className="font-medium">
                              {resultSummary.success > 0 
                                ? "Poeme adăugate cu succes" 
                                : "Eroare la adăugarea poemelor"}
                            </h4>
                            <ul className="text-sm mt-1">
                              <li>{resultSummary.success} poeme adăugate cu succes</li>
                              {resultSummary.failed > 0 && (
                                <li className="text-red-600">
                                  {resultSummary.failed} poeme nu au putut fi adăugate
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                <CardFooter className="px-0 pb-0 pt-4">
                  <Button 
                    type="submit" 
                    className="w-full md:w-auto" 
                    disabled={isSubmitting || isImageUploading || isAudioUploading}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se procesează...
                      </>
                    ) : (
                      "Adaugă poeme"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}