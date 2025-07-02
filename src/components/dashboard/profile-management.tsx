/**
 * 👤 PROFILE MANAGEMENT COMPONENT
 * ==============================
 * 
 * Componente para editar perfil de usuario después del onboarding.
 * Permite editar: datos del negocio, competidores, documentos RAG, etc.
 */

"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  Users, 
  FileText, 
  Plus, 
  X, 
  Save, 
  Loader2,
  AlertCircle,
  CheckCircle,
  Briefcase,
  Target,
  Globe
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface BusinessProfile {
  businessName: string;
  businessType: string;
  description: string;
  targetAudience: string;
  competitors: Array<{
    name: string;
    website: string;
    instagram: string;
  }>;
}

interface ProfileData {
  id: string;
  email: string;
  fullName: string;
  businessProfile: BusinessProfile;
}

export function ProfileManagement() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [description, setDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [competitors, setCompetitors] = useState([
    { name: '', website: '', instagram: '' }
  ]);

  const fetchProfileData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const profile = data.data;
          setProfileData(profile);
          
          // Populate form
          setFullName(profile.fullName || '');
          setBusinessName(profile.businessProfile?.businessName || '');
          setBusinessType(profile.businessProfile?.businessType || '');
          setDescription(profile.businessProfile?.description || '');
          setTargetAudience(profile.businessProfile?.targetAudience || '');
          
          const competitorsList = profile.businessProfile?.competitors || [];
          if (competitorsList.length > 0) {
            setCompetitors(competitorsList);
          }
        }
      }
    } catch (error) {
      console.error('[PROFILE] Error fetching profile:', error);
      setError('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user?.id]);

  const handleAddCompetitor = () => {
    setCompetitors([...competitors, { name: '', website: '', instagram: '' }]);
  };

  const handleRemoveCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const handleCompetitorChange = (index: number, field: string, value: string) => {
    const updatedCompetitors = competitors.map((comp, i) => 
      i === index ? { ...comp, [field]: value } : comp
    );
    setCompetitors(updatedCompetitors);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const businessProfile = {
        businessName,
        businessType,
        description,
        targetAudience,
        competitors: competitors.filter(comp => comp.name.trim() !== '')
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          businessProfile
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess('Perfil actualizado exitosamente');
        fetchProfileData(); // Refresh data
      } else {
        setError(result.error || 'Error al actualizar perfil');
      }
    } catch (error) {
      console.error('[PROFILE] Error saving profile:', error);
      setError('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando perfil...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Perfil del Usuario</h1>
        <p className="text-gray-600">
          Administra la información de tu negocio y perfil empresarial
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Información Personal</span>
          </CardTitle>
          <CardDescription>
            Datos básicos de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nombre Completo
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Email
              </label>
              <Input
                value={user?.email || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building className="h-5 w-5" />
            <span>Información del Negocio</span>
          </CardTitle>
          <CardDescription>
            Detalles sobre tu empresa y modelo de negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nombre del Negocio
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Nombre de tu empresa"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tipo de Negocio
              </label>
              <Input
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="Ej: E-commerce, Servicios, etc."
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Descripción del Negocio
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente tu negocio, productos o servicios..."
              className="w-full p-3 border border-gray-300 rounded-md min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Audiencia Objetivo
            </label>
            <textarea
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Describe tu audiencia objetivo (edad, intereses, ubicación, etc.)"
              className="w-full p-3 border border-gray-300 rounded-md min-h-[80px] focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Competidores</span>
          </CardTitle>
          <CardDescription>
            Información sobre tu competencia para análisis de mercado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {competitors.map((competitor, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">
                  Competidor {index + 1}
                </h4>
                {competitors.length > 1 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveCompetitor(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Nombre
                  </label>
                  <Input
                    value={competitor.name}
                    onChange={(e) => handleCompetitorChange(index, 'name', e.target.value)}
                    placeholder="Nombre del competidor"
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Sitio Web
                  </label>
                  <Input
                    value={competitor.website}
                    onChange={(e) => handleCompetitorChange(index, 'website', e.target.value)}
                    placeholder="https://..."
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Instagram
                  </label>
                  <Input
                    value={competitor.instagram}
                    onChange={(e) => handleCompetitorChange(index, 'instagram', e.target.value)}
                    placeholder="@usuario"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            onClick={handleAddCompetitor}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar Competidor
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveProfile}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
} 