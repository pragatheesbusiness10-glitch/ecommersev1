import React, { useState } from 'react';
import { useMFA } from '@/hooks/useMFA';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Shield, 
  ShieldCheck, 
  ShieldOff, 
  Loader2, 
  QrCode, 
  Copy, 
  Check,
  Trash2,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

export const MFASettings: React.FC = () => {
  const {
    factors,
    isLoading,
    isEnrolling,
    enrollmentData,
    hasMFAEnabled,
    startEnrollment,
    verifyEnrollment,
    cancelEnrollment,
    unenrollFactor,
  } = useMFA();

  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [factorToRemove, setFactorToRemove] = useState<string | null>(null);

  const handleStartEnrollment = async () => {
    await startEnrollment();
    setVerificationCode('');
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    
    setIsVerifying(true);
    const result = await verifyEnrollment(verificationCode);
    setIsVerifying(false);
    
    if (result.success) {
      setVerificationCode('');
    }
  };

  const handleCopySecret = () => {
    if (enrollmentData?.secret) {
      navigator.clipboard.writeText(enrollmentData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  const handleRemoveFactor = async () => {
    if (!factorToRemove) return;
    
    await unenrollFactor(factorToRemove);
    setShowDisableDialog(false);
    setFactorToRemove(null);
  };

  const handleCancel = async () => {
    await cancelEnrollment();
    setVerificationCode('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasMFAEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                {hasMFAEnabled ? (
                  <ShieldCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Shield className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge variant={hasMFAEnabled ? 'default' : 'secondary'}>
              {hasMFAEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasMFAEnabled && !enrollmentData && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  We recommend enabling two-factor authentication to protect your admin account from unauthorized access.
                </AlertDescription>
              </Alert>
              <Button onClick={handleStartEnrollment} disabled={isEnrolling}>
                {isEnrolling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Set up authenticator app
                  </>
                )}
              </Button>
            </div>
          )}

          {enrollmentData && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">Step 1: Scan QR Code</p>
                <p>Open your authenticator app (Google Authenticator, Authy, etc.) and scan the QR code below.</p>
              </div>

              <div className="flex flex-col items-center p-4 border rounded-lg bg-white">
                <img 
                  src={enrollmentData.qrCode} 
                  alt="MFA QR Code" 
                  className="w-48 h-48"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Can't scan? Enter this code manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                    {enrollmentData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    {secretCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <p className="text-sm font-medium">Step 2: Enter verification code</p>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
                <div className="flex gap-2">
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-lg tracking-widest font-mono"
                    maxLength={6}
                  />
                  <Button 
                    onClick={handleVerify} 
                    disabled={verificationCode.length !== 6 || isVerifying}
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </div>

              <Button variant="ghost" onClick={handleCancel} className="w-full">
                Cancel
              </Button>
            </div>
          )}

          {hasMFAEnabled && !enrollmentData && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <QrCode className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">
                        Added {format(new Date(factors[0]?.created_at || Date.now()), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setFactorToRemove(factors[0]?.id);
                      setShowDisableDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Your account is protected with two-factor authentication. You'll need to enter a code from your authenticator app when signing in.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to disable two-factor authentication? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveFactor}>
              Disable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
