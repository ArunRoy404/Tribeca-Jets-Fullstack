import SimpleStatsRow from "@/components/common/SimpleStatsRow";
import EmailTemplatesContainer from "@/components/table/email-templates/EmailTemplatesContainer";
import EmailTemplateDetailSheet from "@/components/email-templates/EmailTemplateDetailSheet";
import NewEmailTemplateDialog from "@/components/email-templates/NewEmailTemplateDialog";
import DeleteEmailTemplateDialog from "@/components/email-templates/DeleteEmailTemplateDialog";
import SendEmailDialog from "@/components/email-templates/SendEmailDialog";
import { emailTemplateStats } from "@/dummyData/emailTemplates";

export default function EmailTemplatesPage() {
  return (
    <div className="flex flex-col gap-6 px-4 sm:px-6 py-6 pb-8">
      <SimpleStatsRow stats={emailTemplateStats} />
      <EmailTemplatesContainer />

      <EmailTemplateDetailSheet />
      <NewEmailTemplateDialog />
      <DeleteEmailTemplateDialog />
      <SendEmailDialog />
    </div>
  );
}
