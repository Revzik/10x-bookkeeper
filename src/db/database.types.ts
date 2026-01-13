export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      books: {
        Row: {
          author: string;
          cover_image_url: string | null;
          created_at: string;
          current_page: number;
          id: string;
          series_id: string | null;
          series_order: number | null;
          status: Database["public"]["Enums"]["book_status"];
          title: string;
          total_pages: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          author: string;
          cover_image_url?: string | null;
          created_at?: string;
          current_page?: number;
          id?: string;
          series_id?: string | null;
          series_order?: number | null;
          status?: Database["public"]["Enums"]["book_status"];
          title: string;
          total_pages: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          author?: string;
          cover_image_url?: string | null;
          created_at?: string;
          current_page?: number;
          id?: string;
          series_id?: string | null;
          series_order?: number | null;
          status?: Database["public"]["Enums"]["book_status"];
          title?: string;
          total_pages?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "books_series_id_fkey";
            columns: ["series_id"];
            isOneToOne: false;
            referencedRelation: "series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "books_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          book_id: string;
          book_order: number;
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          book_order?: number;
          created_at?: string;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          book_order?: number;
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapters_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      note_embeddings: {
        Row: {
          chunk_content: string;
          created_at: string;
          embedding: string;
          id: string;
          note_id: string;
          user_id: string;
        };
        Insert: {
          chunk_content: string;
          created_at?: string;
          embedding: string;
          id?: string;
          note_id: string;
          user_id: string;
        };
        Update: {
          chunk_content?: string;
          created_at?: string;
          embedding?: string;
          id?: string;
          note_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "note_embeddings_note_id_fkey";
            columns: ["note_id"];
            isOneToOne: false;
            referencedRelation: "notes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "note_embeddings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          chapter_id: string;
          content: string;
          created_at: string;
          embedding_duration: number | null;
          embedding_status: Database["public"]["Enums"]["embedding_status"];
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          chapter_id: string;
          content: string;
          created_at?: string;
          embedding_duration?: number | null;
          embedding_status?: Database["public"]["Enums"]["embedding_status"];
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          chapter_id?: string;
          content?: string;
          created_at?: string;
          embedding_duration?: number | null;
          embedding_status?: Database["public"]["Enums"]["embedding_status"];
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notes_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
        };
        Insert: {
          id: string;
        };
        Update: {
          id?: string;
        };
        Relationships: [];
      };
      reading_sessions: {
        Row: {
          book_id: string;
          end_page: number | null;
          ended_at: string | null;
          id: string;
          started_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          end_page?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          end_page?: number | null;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_sessions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reading_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      search_logs: {
        Row: {
          created_at: string;
          id: string;
          query_text: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          query_text: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          query_text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "search_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      series: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "series_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: {
      match_notes: {
        Args: {
          filter_book_id?: string;
          match_count: number;
          match_threshold: number;
          query_embedding: string;
        };
        Returns: {
          book_id: string;
          book_title: string;
          chapter_id: string;
          chapter_title: string;
          chunk_content: string;
          id: string;
          note_id: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      book_status: "want_to_read" | "reading" | "completed";
      embedding_status: "pending" | "processing" | "completed" | "failed";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      book_status: ["want_to_read", "reading", "completed"],
      embedding_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const;
