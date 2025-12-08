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
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Link as LinkIcon, X } from "lucide-react";
import type {
    CommentAuthor,
    FlattenedProfile,
    PostInfo,
    FetchInteractionsResponse,
} from "../shared/types";
import { LinkedInProfileCollapse } from "./components/LinkedInProfileCollapse";

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
    const { toast } = useToast();

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setIsLoading(true);
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

            const data: FetchInteractionsResponse = await response.json();

            // Map API response to CommentAuthor
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mappedAuthors: CommentAuthor[] = data.profiles.map(
                (item: any) => ({
                    id: item.id,
                    name: item.name,
                    profileUrl: item.profileUrl,
                    headline: item.title,
                    scrapedData: item.scrapedData, // Pass the scraped data
                })
            );

            setAuthors(mappedAuthors);
            setPost(data.post);

            // Initialize selections
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

    const handleIgnoreProfile = async (profileId: string) => {
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

    const handleSendToNotion = async () => {
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
                        <DialogTitle>Loading...</DialogTitle>
                        <DialogDescription>Please wait...</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
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
                                            className={
                                                hasDetails
                                                    ? "cursor-pointer"
                                                    : ""
                                            }
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
                                                    <a
                                                        href={author.profileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:underline text-primary w-fit"
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                    >
                                                        {author.name}
                                                    </a>
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
                                                        handleIgnoreProfile(
                                                            author.id
                                                        );
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

            <div className="sticky bottom-0 bg-background pt-2 border-t">
                <Button
                    className="w-full"
                    onClick={handleSendToNotion}
                    disabled={isLoading}
                >
                    Send to Notion
                </Button>
            </div>
            <Toaster />
        </div>
    );
}

export default App;
