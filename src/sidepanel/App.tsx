import { useEffect, useState, Fragment } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ChevronDown,
    ChevronRight,
    Link as LinkIcon,
    X,
    Download,
} from "lucide-react";
import type {
    CommentAuthor,
    FlattenedProfile,
    PostInfo,
    FetchInteractionsResponse,
    FetchInteractionsProgress,
} from "../shared/types";
import { LinkedInProfileCollapse } from "./components/LinkedInProfileCollapse";
import { Badge } from "@/components/ui/badge";

type UserType = "Prospect" | "Consultant transfo";

interface UserSelection {
    selected: boolean;
    type: UserType;
}

const API_URL = import.meta.env.VITE_API_URL;
const AUTH_TOKEN = import.meta.env.VITE_AUTH_TOKEN;

function App() {
    const [authors, setAuthors] = useState<CommentAuthor[]>([]);
    const [post, setPost] = useState<PostInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selections, setSelections] = useState<Record<string, UserSelection>>(
        {}
    );
    const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
    const [progress, setProgress] = useState<FetchInteractionsProgress | null>(null);
    const { toast } = useToast();

    // Confirmation modal states
    const [showNotionConfirm, setShowNotionConfirm] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [profileToIgnore, setProfileToIgnore] = useState<CommentAuthor | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
        setProgress(null);
        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });
            console.log(tab);
            if (
                !tab?.url ||
                (!tab.url.includes("linkedin.com/posts/") &&
                    !tab.url.includes("linkedin.com/feed/update/"))
            ) {
                console.log("Not on a LinkedIn post");
                setIsLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/fetch-interactions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                body: JSON.stringify({ postUrl: tab.url }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Handle SSE stream
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error("No response body");
            }

            const decoder = new TextDecoder();
            let buffer = "";
            // Persist event state across chunks
            let currentEventType = "";
            let currentEventData = "";

            /**
             * Process a complete SSE event
             */
            const processEvent = (eventType: string, eventData: string) => {
                try {
                    const parsed = JSON.parse(eventData);

                    // Check for result: either by event type or by data structure (fallback)
                    const isResult = eventType === "result" || 
                        (Array.isArray(parsed.profiles) && parsed.post);

                    if (isResult) {
                        const data: FetchInteractionsResponse = parsed;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const mappedAuthors: CommentAuthor[] = data.profiles.map(
                            (item: any) => ({
                                id: item.id,
                                name: item.name,
                                profileUrl: item.profileUrl,
                                headline: item.title,
                                sentToNotion: item.sentToNotion,
                                scrapedData: item.scrapedData,
                            })
                        );

                        setAuthors(mappedAuthors);
                        setPost(data.post);

                        setSelections((prev) => {
                            const next = { ...prev };
                            mappedAuthors.forEach((author) => {
                                if (!next[author.id]) {
                                    next[author.id] = { selected: false, type: "Prospect" };
                                }
                            });
                            return next;
                        });

                        toast({
                            title: "Success",
                            description: `Fetched ${mappedAuthors.length} profiles`,
                        });
                    } else if (eventType === "error" || parsed.type === "error") {
                        throw new Error(parsed.message || "Unknown error");
                    } else {
                        // Progress events (fetching, enriching, complete)
                        setProgress(parsed as FetchInteractionsProgress);
                    }
                } catch (parseError) {
                    // Re-throw if it's our own error
                    if (parseError instanceof Error && parseError.message !== "Unknown error") {
                        throw parseError;
                    }
                    console.error("Error parsing SSE event:", parseError);
                }
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Parse SSE events from buffer
                const lines = buffer.split("\n");
                buffer = lines.pop() || ""; // Keep incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith("event:")) {
                        currentEventType = line.slice(6).trim();
                    } else if (line.startsWith("data:")) {
                        currentEventData = line.slice(5).trim();
                    } else if (line === "" && currentEventData) {
                        // Empty line signals end of event - process it
                        processEvent(currentEventType, currentEventData);
                        // Reset for next event
                        currentEventType = "";
                        currentEventData = "";
                    }
                }
            }

            // Process any remaining event in buffer after stream ends
            if (currentEventData) {
                processEvent(currentEventType, currentEventData);
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast({
                title: "Error fetching profiles",
                description:
                    error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
            setProgress(null);
        }
    };

    const toggleSelection = (id: string) => {
        setSelections((prev) => ({
            ...prev,
            [id]: { ...prev[id], selected: !prev[id].selected },
        }));
    };

    const toggleRow = (id: string) => {
        setOpenRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    const updateType = (id: string, type: UserType) => {
        setSelections((prev) => ({
            ...prev,
            [id]: { ...prev[id], type },
        }));
    };

    /**
     * Opens confirmation modal for ignoring a profile
     */
    const handleIgnoreProfileClick = (author: CommentAuthor) => {
        setProfileToIgnore(author);
    };

    /**
     * Confirms and ignores the selected profile
     */
    const confirmIgnoreProfile = async () => {
        if (!profileToIgnore) return;

        const profileId = profileToIgnore.id;
        setProfileToIgnore(null);

        try {
            const response = await fetch(`${API_URL}/ignore-profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                body: JSON.stringify({ profileId }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            // Remove from UI
            setAuthors((prev) => prev.filter((a) => a.id !== profileId));

            toast({
                title: "Profile Ignored",
                description: "The profile has been removed from the list.",
            });
        } catch (error) {
            console.error("Ignore error:", error);
            toast({
                title: "Error ignoring profile",
                description:
                    error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        }
    };

    /**
     * Opens confirmation modal for sending profiles to Notion
     */
    const handleSendToNotionClick = () => {
        const selectedAuthors = authors.filter(
            (a) => selections[a.id]?.selected
        );

        if (selectedAuthors.length === 0) {
            toast({
                title: "No authors selected",
                description: "Please select at least one author to send.",
                variant: "destructive",
            });
            return;
        }

        setShowNotionConfirm(true);
    };

    /**
     * Confirms and sends selected profiles to Notion
     */
    const confirmSendToNotion = async () => {
        const selectedAuthors = authors.filter(
            (a) => selections[a.id]?.selected
        );

        setShowNotionConfirm(false);
        setIsLoading(true);
        try {
            const payload = {
                profile: selectedAuthors.map((author) => ({
                    id: author.id,
                    type:
                        selections[author.id].type === "Prospect"
                            ? "lead"
                            : "consultant",
                    post: post,
                })),
            };

            console.log("Sending to Notion:", payload);

            const response = await fetch(`${API_URL}/add-leads`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            setAuthors((prev) =>
                prev.filter((a) => !selectedAuthors.includes(a))
            );
            setSelections({} as Record<string, UserSelection>);

            toast({
                title: "Sent to Notion",
                description: `Successfully sent ${selectedAuthors.length} authors.`,
            });
        } catch (error) {
            console.error("Send error:", error);
            toast({
                title: "Error sending to Notion",
                description:
                    error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Opens confirmation modal for exporting profiles to CSV
     */
    const handleExportCSVClick = () => {
        if (authors.length === 0) {
            toast({
                title: "No authors to export",
                description: "There are no profiles to export.",
                variant: "destructive",
            });
            return;
        }

        setShowExportConfirm(true);
    };

    /**
     * Confirms and exports profiles to CSV
     */
    const confirmExportCSV = async () => {
        setShowExportConfirm(false);

        try {
            // Create CSV content
            const csvHeader = "URL,Name\n";
            const csvRows = authors
                .map((author) => `"${author.profileUrl}","${author.name}"`)
                .join("\n");
            const csvContent = csvHeader + csvRows;

            // Download CSV file
            const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `linkedin-profiles-${Date.now()}.csv`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Call the /export endpoint
            const response = await fetch(`${API_URL}/export`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                body: JSON.stringify({
                    authors: authors.map((a) => a.id),
                    postId: post?.id,
                }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            setAuthors([]);
            setSelections({} as Record<string, UserSelection>);
            setOpenRows({});
            setPost(null);

            toast({
                title: "CSV Exported",
                description: `Successfully exported ${authors.length} profiles.`,
            });
        } catch (error) {
            console.error("Export error:", error);
            toast({
                title: "Error exporting CSV",
                description:
                    error instanceof Error ? error.message : "Unknown error",
                variant: "destructive",
            });
        }
    };

    // Helper to map CommentAuthor + scrapedData to FlattenedProfile for the component
    const getFlattenedProfile = (
        author: CommentAuthor
    ): FlattenedProfile | null => {
        if (!author.scrapedData || !author.scrapedData.person) return null;
        const p = author.scrapedData.person;

        return {
            fullName: author.name,
            headline: author.headline || p.headline,
            profileImageUrl: p.photoUrl,
            url: author.profileUrl,
            location: p.location, // The API returns location as string based on sample
            connections: p.connections,
            summary: p.summary,
            skills: p.skills,
            experience: p.positions?.positionHistory?.map((pos) => ({
                title: pos.title,
                company: pos.companyName || pos.company || "",
                companyLogo: pos.companyLogo,
                companyLocation: pos.companyLocation,
                startDate: pos.startEndDate?.start
                    ? new Date(
                          pos.startEndDate.start.year,
                          pos.startEndDate.start.month - 1
                      )
                    : undefined,
                endDate: pos.startEndDate?.end
                    ? new Date(
                          pos.startEndDate.end.year,
                          pos.startEndDate.end.month - 1
                      )
                    : undefined,
                duration: pos.duration,
                description: pos.description,
            })),
            education: p.schools?.educationHistory?.map((edu) => ({
                institution: edu.schoolName || "",
                schoolLogo: edu.schoolLogo,
                degree: edu.degreeName,
                field: edu.fieldOfStudy,
                startDate: edu.startEndDate?.start
                    ? new Date(
                          edu.startEndDate.start.year,
                          edu.startEndDate.start.month - 1
                      )
                    : undefined,
                endDate: edu.startEndDate?.end
                    ? new Date(
                          edu.startEndDate.end.year,
                          edu.startEndDate.end.month - 1
                      )
                    : undefined,
                duration: edu.duration,
                description: edu.description,
            })),
        };
    };

    return (
        <div className="p-4 min-h-screen bg-background text-foreground flex flex-col relative">
            <Dialog open={isLoading}>
                <DialogContent
                    className="sm:max-w-[425px]"
                    onInteractOutside={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>
                            {progress?.type === 'fetching' && 'Fetching data...'}
                            {progress?.type === 'enriching' && 'Enriching profiles...'}
                            {progress?.type === 'complete' && 'Complete!'}
                            {!progress && 'Loading...'}
                        </DialogTitle>
                        <DialogDescription>
                            {progress?.message || 'Please wait...'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {/* Progress bar for enriching */}
                        {progress?.type === 'enriching' && progress.total && progress.current !== undefined && (
                            <div className="w-full space-y-2">
                                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm text-muted-foreground text-center">
                                    {progress.current} / {progress.total} profiles
                                </p>
                            </div>
                        )}
                        {/* Spinner for fetching phase */}
                        {(progress?.type === 'fetching' || !progress) && (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        )}
                        {/* Success icon for complete */}
                        {progress?.type === 'complete' && (
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/20 text-green-500">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Confirmation modal for Send to Notion */}
            <Dialog open={showNotionConfirm} onOpenChange={setShowNotionConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm Send to Notion</DialogTitle>
                        <DialogDescription>
                            You are about to send{" "}
                            <span className="font-semibold text-foreground">
                                {Object.values(selections).filter((s) => s.selected).length}
                            </span>{" "}
                            profile{Object.values(selections).filter((s) => s.selected).length > 1 ? "s" : ""} to Notion.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNotionConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmSendToNotion}>
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation modal for Export CSV */}
            <Dialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Confirm CSV Export</DialogTitle>
                        <DialogDescription>
                            You are about to export{" "}
                            <span className="font-semibold text-foreground">
                                {authors.length}
                            </span>{" "}
                            profile{authors.length > 1 ? "s" : ""} to CSV.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExportConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmExportCSV}>
                            Export
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmation modal for Ignore Profile */}
            <Dialog open={!!profileToIgnore} onOpenChange={(open) => !open && setProfileToIgnore(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Ignore Profile</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to ignore{" "}
                            <span className="font-semibold text-foreground">
                                {profileToIgnore?.name}
                            </span>
                            ? This profile will be removed from the list.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setProfileToIgnore(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmIgnoreProfile}>
                            Ignore
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex flex-col gap-4 mb-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-bold">LinkedIn Comments</h1>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchProfiles}
                        disabled={isLoading}
                    >
                        Refresh
                    </Button>
                </div>

                {post && (
                    <div className="bg-muted/50 p-3 rounded-md border text-sm">
                        <div className="flex items-center gap-2 mb-1 text-muted-foreground font-medium">
                            <LinkIcon className="h-3 w-3" />
                            <span>Post Hook</span>
                        </div>
                        <p className="line-clamp-3">{post.content}</p>
                    </div>
                )}
            </div>

            {/* Profile count display */}
            {authors.length > 0 && (
                <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
                    <span>
                        {authors.length} profile{authors.length > 1 ? "s" : ""} found
                    </span>
                    <span>
                        {Object.values(selections).filter((s) => s.selected).length} selected
                    </span>
                </div>
            )}

            <div className="flex-1 overflow-auto border rounded-md mb-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30px]"></TableHead>
                            <TableHead className="w-[50px]">Sel</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead className="w-[140px]">Type</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {authors.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={5}
                                    className="text-center py-8 text-muted-foreground"
                                >
                                    No profiles found or not on a post.
                                </TableCell>
                            </TableRow>
                        ) : (
                            authors.map((author) => {
                                const flattenedProfile =
                                    getFlattenedProfile(author);
                                const isOpen = openRows[author.id];
                                const hasDetails = !!flattenedProfile;

                                return (
                                    <Fragment key={author.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleSelection(author.id)}
                                        >
                                            <TableCell className="px-2">
                                                {hasDetails && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleRow(
                                                                author.id
                                                            );
                                                        }}
                                                    >
                                                        {isOpen ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Checkbox
                                                    checked={
                                                        selections[author.id]
                                                            ?.selected
                                                    }
                                                    onCheckedChange={() =>
                                                        toggleSelection(
                                                            author.id
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <div className="flex gap-2">
                                                        <a
                                                            href={
                                                                author.profileUrl
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:underline text-primary w-fit"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            {author.name}
                                                        </a>

                                                        {author.sentToNotion && (
                                                            <Badge>
                                                                Déjà contacté
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {author.headline && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {author.headline}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <Select
                                                    value={
                                                        selections[author.id]
                                                            ?.type
                                                    }
                                                    onValueChange={(val) =>
                                                        updateType(
                                                            author.id,
                                                            val as UserType
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Prospect">
                                                            Prospect
                                                        </SelectItem>
                                                        <SelectItem value="Consultant transfo">
                                                            Consultant
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleIgnoreProfileClick(author);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                        {hasDetails && isOpen && (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="p-0 border-t-0"
                                                >
                                                    <div className="p-2 bg-muted/20">
                                                        {flattenedProfile && (
                                                            <LinkedInProfileCollapse
                                                                profile={
                                                                    flattenedProfile
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="sticky bottom-0 bg-background pt-2 border-t flex gap-2">
                <Button
                    className="flex-1"
                    onClick={handleSendToNotionClick}
                    disabled={isLoading}
                >
                    Send to Notion
                </Button>
                <Button
                    variant="outline"
                    onClick={handleExportCSVClick}
                    disabled={isLoading || authors.length === 0}
                >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                </Button>
            </div>
            <Toaster />
        </div>
    );
}

export default App;
