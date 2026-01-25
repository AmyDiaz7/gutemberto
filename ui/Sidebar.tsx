"use client";

import {
  Navbar,
  NavbarBrand,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  Skeleton,
} from "@heroui/react";
import { LogOut } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User as UserCard } from "@heroui/react";

import { createClient } from "@/lib/utils/supabase/client";

export default function Sidebar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname().split("/").filter(Boolean)[0] || "";
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const menuItems = ["Productos", "Pedidos"];

  return (
    <>
      {isLoggingOut && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 dark:bg-background/60 backdrop-blur-md"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-4 border-primary/25" />
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary" />
            </div>
            <span className="text-sm font-medium text-foreground/80">
              Cerrando sesión...
            </span>
          </div>
        </div>
      )}
      <Navbar
        classNames={{
          base: "inline-flex w-full lg:flex-col max-lg:sticky max-lg:top-0 max-lg:inset-x-0 lg:h-screen lg:w-1/6 lg:py-8 lg:px-4 bg-default-50",
          wrapper: "lg:flex-col lg:h-full",
          content: "lg:flex-col lg:w-full",
          menu: "pl-12 pt-5 gap-3",
        }}
        position="static"
        onMenuOpenChange={setIsMenuOpen}
      >
        <NavbarContent>
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className="lg:hidden"
            isDisabled={isLoggingOut}
          />
          <NavbarBrand className="justify-center lg:justify-start">
            <p className="font-bold text-xl lg:text-2xl text-inherit max-lg:-left-2 max-lg:relative">
              Gutemberto
            </p>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent
          className="hidden lg:flex gap-4 items-start !justify-start py-8"
          justify="center"
        >
          {menuItems.map((item, index) => {
            const curItem = item.toLocaleLowerCase();

            return (
              <NavbarItem
                key={`${item}-${index}`}
                aria-current={pathname === curItem ? "page" : undefined}
                isActive={pathname === curItem}
              >
                <Link
                  color={pathname === curItem ? "primary" : "foreground"}
                  href={"/" + curItem}
                >
                  {item}
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>
        <NavbarContent className="hidden lg:flex !flex-[0-0-0%]">
          <Skeleton className="w-full rounded-lg" isLoaded={userEmail !== null}>
            <UserCard
              avatarProps={{
                name: (userEmail ?? "G").slice(0, 1).toUpperCase(),
                size: "sm",
                classNames: { base: "hidden" },
              }}
              className="w-full flex flex-col items-center text-center"
              classNames={{
                base: "w-full justify-center w-fit",
                wrapper: "flex justify-center max-w-[100%]",
                name: "w-full truncate text-center",
                description: "text-center",
              }}
              description={userEmail ? "Administrador" : "Funcionario"}
              name={userEmail ?? "Invitado"}
            />
          </Skeleton>
          <Skeleton className="w-full rounded-lg" isLoaded={userEmail !== null}>
            <Button
              className="w-full"
              color="default"
              endContent={<LogOut size={16} />}
              variant="light"
              isDisabled={isLoggingOut}
              onPress={async () => {
                setIsLoggingOut(true);
                await supabase.auth.signOut();
                router.push("/login");
              }}
            >
              Cerrar sesión
            </Button>
          </Skeleton>
        </NavbarContent>
        <NavbarMenu>
          {menuItems.map((item, index) => {
            const curItem = item.toLocaleLowerCase();

            return (
              <NavbarMenuItem key={`${item}-${index}`} className="text-center">
                <Link
                  color={pathname === curItem ? "primary" : "foreground"}
                  href={`/${curItem}`}
                  size="lg"
                >
                  {item}
                </Link>
              </NavbarMenuItem>
            );
          })}
          <NavbarMenuItem className="text-center">
            <Button
              className="mt-2"
              color="danger"
              endContent={<LogOut size={16} />}
              size="lg"
              variant="flat"
              isDisabled={isLoggingOut}
              onPress={async () => {
                setIsLoggingOut(true);
                await supabase.auth.signOut();
                router.push("/login");
              }}
            >
              Cerrar sesión
            </Button>
          </NavbarMenuItem>
        </NavbarMenu>
      </Navbar>
    </>
  );
}
