export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      account_activity: {
        Row: {
          account_id: string;
          created_at: string;
          dedupe_key: string;
          id: string;
          list_id: string | null;
          payload: Json;
          review_id: string | null;
          target_account_id: string | null;
          tmdb_id: number | null;
          type: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          dedupe_key: string;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          review_id?: string | null;
          target_account_id?: string | null;
          tmdb_id?: number | null;
          type: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          dedupe_key?: string;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          review_id?: string | null;
          target_account_id?: string | null;
          tmdb_id?: number | null;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_activity_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_activity_target_account_id_fkey";
            columns: ["target_account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_diary: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          id: string;
          is_rewatch: boolean;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
          watched_at: string;
          watched_on: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          id?: string;
          is_rewatch?: boolean;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
          watched_at?: string;
          watched_on?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          id?: string;
          is_rewatch?: boolean;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
          watched_at?: string;
          watched_on?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_diary_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_emails: {
        Row: {
          account_id: string;
          created_at: string;
          email: string;
          id: string;
          is_primary: boolean;
          verified_at: string | null;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          email: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          email?: string;
          id?: string;
          is_primary?: boolean;
          verified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "account_emails_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_favorites: {
        Row: {
          account_id: string;
          created_at: string;
          position: number;
          tmdb_id: number;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          position: number;
          tmdb_id: number;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          position?: number;
          tmdb_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "account_favorites_like_fkey";
            columns: ["account_id", "tmdb_id"];
            isOneToOne: true;
            referencedRelation: "account_likes";
            referencedColumns: ["account_id", "tmdb_id"];
          },
        ];
      };
      account_follows: {
        Row: {
          created_at: string;
          follower_id: string;
          following_id: string;
          id: string;
          responded_at: string | null;
          status: "pending" | "accepted" | "rejected";
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          follower_id: string;
          following_id: string;
          id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          follower_id?: string;
          following_id?: string;
          id?: string;
          responded_at?: string | null;
          status?: "pending" | "accepted" | "rejected";
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_follows_following_id_fkey";
            columns: ["following_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_likes: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_stats: {
        Row: {
          account_id: string;
          diary_count: number;
          followers_count: number;
          following_count: number;
          likes_count: number;
          lists_count: number;
          reviews_count: number;
          updated_at: string;
          watched_count: number;
          watchlist_count: number;
        };
        Insert: {
          account_id: string;
          diary_count?: number;
          followers_count?: number;
          following_count?: number;
          likes_count?: number;
          lists_count?: number;
          reviews_count?: number;
          updated_at?: string;
          watched_count?: number;
          watchlist_count?: number;
        };
        Update: {
          account_id?: string;
          diary_count?: number;
          followers_count?: number;
          following_count?: number;
          likes_count?: number;
          lists_count?: number;
          reviews_count?: number;
          updated_at?: string;
          watched_count?: number;
          watchlist_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "account_stats_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: true;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_watched: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          first_watched_at: string;
          last_watched_at: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          first_watched_at?: string;
          last_watched_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          first_watched_at?: string;
          last_watched_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_watched_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      account_watchlist: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          payload: Json;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          payload?: Json;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_watchlist_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      accounts: {
        Row: {
          avatar_url: string | null;
          background_url: string | null;
          banner_position: string | null;
          banner_url: string | null;
          bio: string | null;
          created_at: string;
          deactivated_at: string | null;
          display_name: string | null;
          id: string;
          is_active: boolean;
          is_private: boolean;
          status: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          background_url?: string | null;
          banner_position?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          display_name?: string | null;
          id: string;
          is_active?: boolean;
          is_private?: boolean;
          status?: never;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          background_url?: string | null;
          banner_position?: string | null;
          banner_url?: string | null;
          bio?: string | null;
          created_at?: string;
          deactivated_at?: string | null;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          is_private?: boolean;
          status?: never;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      auth_events: {
        Row: {
          created_at: string;
          id: number;
          ip_address: string | null;
          metadata: Json;
          session_id: string | null;
          type: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          ip_address?: string | null;
          metadata?: Json;
          session_id?: string | null;
          type: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          ip_address?: string | null;
          metadata?: Json;
          session_id?: string | null;
          type?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      auth_sessions: {
        Row: {
          created_at: string;
          ip_address: string | null;
          last_seen_at: string;
          revoked_at: string | null;
          session_id: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          ip_address?: string | null;
          last_seen_at?: string;
          revoked_at?: string | null;
          session_id?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      list_items: {
        Row: {
          backdrop_path: string | null;
          created_at: string;
          list_id: string;
          payload: Json;
          position: number;
          poster_path: string | null;
          release_date: string | null;
          title: string;
          tmdb_id: number;
          updated_at: string;
        };
        Insert: {
          backdrop_path?: string | null;
          created_at?: string;
          list_id: string;
          payload?: Json;
          position?: number;
          poster_path?: string | null;
          release_date?: string | null;
          title: string;
          tmdb_id: number;
          updated_at?: string;
        };
        Update: {
          backdrop_path?: string | null;
          created_at?: string;
          list_id?: string;
          payload?: Json;
          position?: number;
          poster_path?: string | null;
          release_date?: string | null;
          title?: string;
          tmdb_id?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      list_likes: {
        Row: {
          account_id: string;
          created_at: string;
          list_id: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          list_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          list_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "list_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "list_likes_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
      lists: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          created_at: string;
          description: string;
          id: string;
          is_private: boolean;
          is_ranked: boolean;
          items_count: number;
          likes_count: number;
          poster_path: string | null;
          reviews_count: number;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_private?: boolean;
          is_ranked?: boolean;
          items_count?: number;
          likes_count?: number;
          poster_path?: string | null;
          reviews_count?: number;
          slug?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          is_private?: boolean;
          is_ranked?: boolean;
          items_count?: number;
          likes_count?: number;
          poster_path?: string | null;
          reviews_count?: number;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lists_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          actor_id: string | null;
          created_at: string;
          dedupe_key: string | null;
          id: string;
          list_id: string | null;
          payload: Json;
          read: boolean;
          read_at: string | null;
          review_id: string | null;
          type: string;
          user_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          review_id?: string | null;
          type: string;
          user_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          list_id?: string | null;
          payload?: Json;
          read?: boolean;
          read_at?: string | null;
          review_id?: string | null;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
        ];
      };
      review_likes: {
        Row: {
          account_id: string;
          created_at: string;
          review_id: string;
        };
        Insert: {
          account_id: string;
          created_at?: string;
          review_id: string;
        };
        Update: {
          account_id?: string;
          created_at?: string;
          review_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_likes_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_likes_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          account_id: string;
          backdrop_path: string | null;
          content: string;
          created_at: string;
          id: string;
          is_spoiler: boolean;
          likes_count: number;
          list_id: string | null;
          poster_path: string | null;
          rating: number | null;
          release_date: string | null;
          title: string | null;
          tmdb_id: number | null;
          updated_at: string;
        };
        Insert: {
          account_id: string;
          backdrop_path?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_spoiler?: boolean;
          likes_count?: number;
          list_id?: string | null;
          poster_path?: string | null;
          rating?: number | null;
          release_date?: string | null;
          title?: string | null;
          tmdb_id?: number | null;
          updated_at?: string;
        };
        Update: {
          account_id?: string;
          backdrop_path?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          is_spoiler?: boolean;
          likes_count?: number;
          list_id?: string | null;
          poster_path?: string | null;
          rating?: number | null;
          release_date?: string | null;
          title?: string | null;
          tmdb_id?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_account_id_fkey";
            columns: ["account_id"];
            isOneToOne: false;
            referencedRelation: "accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      deactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      get_account_follow_target: {
        Args: {
          p_user_id: string;
        };
        Returns: {
          id: string;
          is_private: boolean;
        }[];
      };
      get_popular_movies: {
        Args: {
          p_days?: number;
          p_limit?: number;
        };
        Returns: {
          backdrop_path: string | null;
          likers: number;
          listers: number;
          poster_path: string | null;
          release_date: string | null;
          reviewers: number;
          score: number;
          title: string;
          tmdb_id: number;
          watchers: number;
        }[];
      };
      get_movie_social_proof: {
        Args: {
          p_limit?: number;
          p_tmdb_id: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string | null;
          display_name: string | null;
          liked: boolean;
          rating: number | null;
          reviewed: boolean;
          total: number;
          username: string;
          watched: boolean;
          watchlisted: boolean;
        }[];
      };
      get_mutual_followers: {
        Args: {
          p_account_id: string;
          p_limit?: number;
        };
        Returns: {
          account_id: string;
          avatar_url: string | null;
          display_name: string | null;
          total: number;
          username: string;
        }[];
      };
      prune_account_data: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      reactivate_current_account: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      record_auth_event: {
        Args: {
          p_ip_address?: string | null;
          p_metadata?: Json | null;
          p_type: string;
          p_user_agent?: string | null;
        };
        Returns: void;
      };
      refresh_account_stats: {
        Args: {
          p_account_id: string;
        };
        Returns: void;
      };
      reorder_list_items: {
        Args: {
          p_list_id: string;
          p_tmdb_ids: number[];
        };
        Returns: void;
      };
      revoke_auth_session: {
        Args: {
          p_session_id: string;
        };
        Returns: void;
      };
      revoke_other_auth_sessions: {
        Args: {
          p_current_session_id: string;
        };
        Returns: void;
      };
      touch_auth_session: {
        Args: {
          p_ip_address?: string | null;
          p_session_id: string;
          p_user_agent?: string | null;
        };
        Returns: void;
      };
      update_account: {
        Args: {
          p_avatar_url?: string | null;
          p_background_url?: string | null;
          p_banner_position?: string | null;
          p_banner_url?: string | null;
          p_bio?: string | null;
          p_display_name?: string | null;
          p_is_private?: boolean | null;
          p_username?: string | null;
        };
        Returns: Database["public"]["Tables"]["accounts"]["Row"][];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
