import { GoogleLogin } from "@react-oauth/google"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "@/auth/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginPage() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/"

  if (user) return <Navigate to={from} replace />

  return (
    <div className="flex justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Use your Google account to continue.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <GoogleLogin
            onSuccess={async (res) => {
              if (!res.credential) return
              try {
                await loginWithGoogle(res.credential)
                navigate(from, { replace: true })
              } catch (e) {
                toast.error((e as Error).message)
              }
            }}
            onError={() => toast.error("Google sign-in failed")}
          />
        </CardContent>
      </Card>
    </div>
  )
}
