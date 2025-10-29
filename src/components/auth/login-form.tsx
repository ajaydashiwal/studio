"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building, KeyRound } from 'lucide-react';
import imageData from '@/app/lib/placeholder-images.json';

interface LoginFormProps {
  onLogin: (flatNo: string, password: string) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [flatNo, setFlatNo] = useState('');
  const [password, setPassword] = useState('');
  const { login_building } = imageData;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(flatNo, password);
  };

  return (
    <Card className="w-full max-w-sm shadow-xl overflow-hidden">
      <div className="relative">
          <Image 
              src={login_building.src}
              alt={login_building.alt}
              width={login_building.width}
              height={login_building.height}
              className="w-full object-cover"
              priority
              data-ai-hint={login_building.hint}
          />
      </div>
      <CardHeader className="text-center">
        <CardTitle className="text-xl md:text-2xl font-headline">Upvan Apartment Resident Welfare Association</CardTitle>
        <CardDescription>Please sign in to view your maintenance records</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="flatNo">Flat Number</Label>
            <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                id="flatNo"
                type="number"
                placeholder="e.g., 101"
                required
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                className="pl-10"
                />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
            Login
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
