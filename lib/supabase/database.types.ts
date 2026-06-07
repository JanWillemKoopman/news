export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      budget_items: {
        Row: {
          betaald_bedrag: number
          betaaltermijnen: Json
          categorie: string
          created_at: string
          geoffreerd_bedrag: number
          geschat_bedrag: number
          id: string
          omschrijving: string
          updated_at: string
          vendor_id: string | null
          wedding_id: string
        }
        Insert: {
          betaald_bedrag?: number
          betaaltermijnen?: Json
          categorie: string
          created_at?: string
          geoffreerd_bedrag?: number
          geschat_bedrag?: number
          id?: string
          omschrijving?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id: string
        }
        Update: {
          betaald_bedrag?: number
          betaaltermijnen?: Json
          categorie?: string
          created_at?: string
          geoffreerd_bedrag?: number
          geschat_bedrag?: number
          id?: string
          omschrijving?: string
          updated_at?: string
          vendor_id?: string | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_budget_items_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          aantal_kinderen: number
          achternaam: string
          adres: string
          categorie: string
          created_at: string
          dieetwensen: string
          gasttype: string
          heeft_partner: boolean
          id: string
          notitie: string
          partner_naam: string
          rsvp_status: string
          rsvp_submitted_at: string | null
          rsvp_token: string
          rsvp_token_revoked: boolean
          tafel_id: string | null
          updated_at: string
          voornaam: string
          wedding_id: string
        }
        Insert: {
          aantal_kinderen?: number
          achternaam?: string
          adres?: string
          categorie: string
          created_at?: string
          dieetwensen?: string
          gasttype?: string
          heeft_partner?: boolean
          id?: string
          notitie?: string
          partner_naam?: string
          rsvp_status?: string
          rsvp_submitted_at?: string | null
          rsvp_token?: string
          rsvp_token_revoked?: boolean
          tafel_id?: string | null
          updated_at?: string
          voornaam?: string
          wedding_id: string
        }
        Update: {
          aantal_kinderen?: number
          achternaam?: string
          adres?: string
          categorie?: string
          created_at?: string
          dieetwensen?: string
          gasttype?: string
          heeft_partner?: boolean
          id?: string
          notitie?: string
          partner_naam?: string
          rsvp_status?: string
          rsvp_submitted_at?: string | null
          rsvp_token?: string
          rsvp_token_revoked?: boolean
          tafel_id?: string | null
          updated_at?: string
          voornaam?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_guests_tafel"
            columns: ["tafel_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guests_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          app_role: string
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_herinneringen: boolean
          id: string
          updated_at: string
        }
        Insert: {
          app_role?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_herinneringen?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          app_role?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_herinneringen?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminder_log: {
        Row: {
          email: string
          id: string
          mijlpaal: string
          ref_id: string
          sent_at: string
          soort: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          email?: string
          id?: string
          mijlpaal: string
          ref_id: string
          sent_at?: string
          soort: string
          user_id: string
          wedding_id: string
        }
        Update: {
          email?: string
          id?: string
          mijlpaal?: string
          ref_id?: string
          sent_at?: string
          soort?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: []
      }
      schedule_items: {
        Row: {
          betrokkenen: Json
          created_at: string
          id: string
          locatie: string
          omschrijving: string
          tijd: string
          titel: string
          updated_at: string
          wedding_id: string
        }
        Insert: {
          betrokkenen?: Json
          created_at?: string
          id?: string
          locatie?: string
          omschrijving?: string
          tijd?: string
          titel?: string
          updated_at?: string
          wedding_id: string
        }
        Update: {
          betrokkenen?: Json
          created_at?: string
          id?: string
          locatie?: string
          omschrijving?: string
          tijd?: string
          titel?: string
          updated_at?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_items_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capaciteit: number
          created_at: string
          id: string
          naam: string
          updated_at: string
          vorm: string
          wedding_id: string
        }
        Insert: {
          capaciteit?: number
          created_at?: string
          id?: string
          naam?: string
          updated_at?: string
          vorm?: string
          wedding_id: string
        }
        Update: {
          capaciteit?: number
          created_at?: string
          id?: string
          naam?: string
          updated_at?: string
          vorm?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string | null
          author_name: string
          body: string
          created_at: string
          id: string
          task_id: string
          wedding_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string
          body: string
          created_at?: string
          id?: string
          task_id: string
          wedding_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          task_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignees: string[]
          budget_item_id: string | null
          created_at: string
          deadline: string | null
          id: string
          omschrijving: string
          prioriteit: string
          status: string
          subtaken: Json
          tijdsblok: string
          titel: string
          toegewezen_aan: string
          updated_at: string
          vendor_id: string | null
          volgorde: number | null
          wedding_id: string
        }
        Insert: {
          assignees?: string[]
          budget_item_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          omschrijving?: string
          prioriteit?: string
          status?: string
          subtaken?: Json
          tijdsblok?: string
          titel?: string
          toegewezen_aan?: string
          updated_at?: string
          vendor_id?: string | null
          volgorde?: number | null
          wedding_id: string
        }
        Update: {
          assignees?: string[]
          budget_item_id?: string | null
          created_at?: string
          deadline?: string | null
          id?: string
          omschrijving?: string
          prioriteit?: string
          status?: string
          subtaken?: Json
          tijdsblok?: string
          titel?: string
          toegewezen_aan?: string
          updated_at?: string
          vendor_id?: string | null
          volgorde?: number | null
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tasks_budget_item"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tasks_vendor"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          budget_item_id: string | null
          contactpersoon: string
          created_at: string
          email: string
          geoffreerd_bedrag: number
          id: string
          naam: string
          notitie: string
          status: string
          telefoon: string
          type: string
          updated_at: string
          website: string
          wedding_id: string
        }
        Insert: {
          budget_item_id?: string | null
          contactpersoon?: string
          created_at?: string
          email?: string
          geoffreerd_bedrag?: number
          id?: string
          naam?: string
          notitie?: string
          status?: string
          telefoon?: string
          type: string
          updated_at?: string
          website?: string
          wedding_id: string
        }
        Update: {
          budget_item_id?: string | null
          contactpersoon?: string
          created_at?: string
          email?: string
          geoffreerd_bedrag?: number
          id?: string
          naam?: string
          notitie?: string
          status?: string
          telefoon?: string
          type?: string
          updated_at?: string
          website?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_vendors_budget_item"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      website_content: {
        Row: {
          cadeaulijst: string
          contact: string
          created_at: string
          dresscode: string
          faq: Json
          gallerij: Json
          header_foto_url: string
          header_overlay: number
          hotels: string
          id: string
          kop_lettertype: string
          kleur_accent: string
          routebeschrijving: string
          secties_config: Json
          slug: string | null
          thema: string
          updated_at: string
          wedding_id: string
          website_gepubliceerd: boolean
          welkomsttekst: string
        }
        Insert: {
          cadeaulijst?: string
          contact?: string
          created_at?: string
          dresscode?: string
          faq?: Json
          gallerij?: Json
          header_foto_url?: string
          header_overlay?: number
          hotels?: string
          id?: string
          kop_lettertype?: string
          kleur_accent?: string
          routebeschrijving?: string
          secties_config?: Json
          slug?: string | null
          thema?: string
          updated_at?: string
          wedding_id: string
          website_gepubliceerd?: boolean
          welkomsttekst?: string
        }
        Update: {
          cadeaulijst?: string
          contact?: string
          created_at?: string
          dresscode?: string
          faq?: Json
          gallerij?: Json
          header_foto_url?: string
          header_overlay?: number
          hotels?: string
          id?: string
          kop_lettertype?: string
          kleur_accent?: string
          routebeschrijving?: string
          secties_config?: Json
          slug?: string | null
          thema?: string
          updated_at?: string
          wedding_id?: string
          website_gepubliceerd?: boolean
          welkomsttekst?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_content_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: true
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      website_fotos: {
        Row: {
          bijschrift: string
          created_at: string
          id: string
          url: string
          volgorde: number
          wedding_id: string
        }
        Insert: {
          bijschrift?: string
          created_at?: string
          id?: string
          url: string
          volgorde?: number
          wedding_id: string
        }
        Update: {
          bijschrift?: string
          created_at?: string
          id?: string
          url?: string
          volgorde?: number
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_fotos_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_activity: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          label: string
          module: string
          wedding_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          label?: string
          module: string
          wedding_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          label?: string
          module?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_activity_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          role: string
          token: string
          wedding_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          wedding_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          role?: string
          token?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_invites_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          wedding_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          wedding_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_members_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      wedding_role_permissions: {
        Row: {
          level: string
          module: string
          role: string
          wedding_id: string
        }
        Insert: {
          level: string
          module: string
          role: string
          wedding_id: string
        }
        Update: {
          level?: string
          module?: string
          role?: string
          wedding_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wedding_role_permissions_wedding_id_fkey"
            columns: ["wedding_id"]
            isOneToOne: false
            referencedRelation: "weddings"
            referencedColumns: ["id"]
          },
        ]
      }
      weddings: {
        Row: {
          aantal_avondgasten: number
          aantal_daggasten: number
          created_at: string
          created_by: string | null
          id: string
          locatie: string
          partner1_naam: string
          partner2_naam: string
          totaal_budget: number
          trouwdatum: string | null
          updated_at: string
          woonplaats: string
        }
        Insert: {
          aantal_avondgasten?: number
          aantal_daggasten?: number
          created_at?: string
          created_by?: string | null
          id?: string
          locatie?: string
          partner1_naam?: string
          partner2_naam?: string
          totaal_budget?: number
          trouwdatum?: string | null
          updated_at?: string
          woonplaats?: string
        }
        Update: {
          aantal_avondgasten?: number
          aantal_daggasten?: number
          created_at?: string
          created_by?: string | null
          id?: string
          locatie?: string
          partner1_naam?: string
          partner2_naam?: string
          totaal_budget?: number
          trouwdatum?: string | null
          updated_at?: string
          woonplaats?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      check_slug_available: { Args: { p_slug: string }; Returns: boolean }
      get_public_website: { Args: { p_slug: string }; Returns: Json }
      can_edit: {
        Args: { p_module: string; p_wedding: string }
        Returns: boolean
      }
      can_view: {
        Args: { p_module: string; p_wedding: string }
        Returns: boolean
      }
      get_public_wedding: { Args: { p_token: string }; Returns: Json }
      is_platform_admin: { Args: never; Returns: boolean }
      is_wedding_member: { Args: { p_wedding: string }; Returns: boolean }
      list_wedding_members: {
        Args: { p_wedding: string }
        Returns: {
          avatar_url: string | null
          display_name: string
          email: string
          role: string
          user_id: string
        }[]
      }
      member_role: { Args: { p_wedding: string }; Returns: string }
      module_level: {
        Args: { p_module: string; p_wedding: string }
        Returns: string
      }
      submit_rsvp: {
        Args: { p_payload: Json; p_token: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

