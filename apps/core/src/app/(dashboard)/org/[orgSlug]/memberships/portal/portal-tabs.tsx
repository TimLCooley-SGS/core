"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@sgscore/ui";
import type {
  PortalSettings,
  PortalModule,
  PortalAnnouncement,
  PortalQuestion,
  MembershipCardDesign,
} from "@sgscore/types/tenant";
import { DesignerTab } from "./designer-tab";
import { GalleryTab } from "./gallery-tab";
import { AnnouncementsTab } from "./announcements-tab";
import { QuestionsTab } from "./questions-tab";
import { SettingsTab } from "./settings-tab";

interface PortalTabsProps {
  orgSlug: string;
  settings: PortalSettings | null;
  modules: PortalModule[];
  announcements: PortalAnnouncement[];
  questions: (PortalQuestion & { person_name?: string })[];
  cardDesigns: MembershipCardDesign[];
}

export function PortalTabs({
  orgSlug,
  settings,
  modules,
  announcements,
  questions,
  cardDesigns,
}: PortalTabsProps) {
  return (
    <Tabs defaultValue="designer">
      <TabsList>
        <TabsTrigger value="designer">Designer</TabsTrigger>
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="announcements">Announcements</TabsTrigger>
        <TabsTrigger value="questions">Questions</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="designer" className="mt-6">
        <DesignerTab orgSlug={orgSlug} settings={settings} />
      </TabsContent>

      <TabsContent value="gallery" className="mt-6">
        <GalleryTab orgSlug={orgSlug} modules={modules} />
      </TabsContent>

      <TabsContent value="announcements" className="mt-6">
        <AnnouncementsTab orgSlug={orgSlug} announcements={announcements} />
      </TabsContent>

      <TabsContent value="questions" className="mt-6">
        <QuestionsTab orgSlug={orgSlug} questions={questions} />
      </TabsContent>

      <TabsContent value="settings" className="mt-6">
        <SettingsTab
          orgSlug={orgSlug}
          settings={settings}
          cardDesigns={cardDesigns}
        />
      </TabsContent>
    </Tabs>
  );
}
